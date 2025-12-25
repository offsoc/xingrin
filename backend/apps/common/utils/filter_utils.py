"""智能过滤工具 - 通用查询语法解析和 Django ORM 查询构建

支持的语法：
- field="value"     模糊匹配（包含）
- field=="value"    精确匹配
- field!="value"    不等于

逻辑运算符：
- AND: && 或 and 或 空格（默认）
- OR:  || 或 or

示例：
    type="xss" || type="sqli"           # OR
    type="xss" or type="sqli"           # OR（等价）
    severity="high" && source="nuclei"  # AND
    severity="high" source="nuclei"     # AND（空格默认为 AND）
    severity="high" and source="nuclei" # AND（等价）

使用示例：
    from apps.common.utils.filter_utils import apply_filters
    
    field_mapping = {'ip': 'ip', 'port': 'port', 'host': 'host'}
    queryset = apply_filters(queryset, 'ip="192" || port="80"', field_mapping)
"""

import re
import logging
from dataclasses import dataclass
from typing import List, Dict, Optional, Union
from enum import Enum

from django.db.models import QuerySet, Q

logger = logging.getLogger(__name__)


class LogicalOp(Enum):
    """逻辑运算符"""
    AND = 'AND'
    OR = 'OR'


@dataclass
class ParsedFilter:
    """解析后的过滤条件"""
    field: str      # 字段名
    operator: str   # 操作符: '=', '==', '!='
    value: str      # 原始值


@dataclass
class FilterGroup:
    """过滤条件组（带逻辑运算符）"""
    filter: ParsedFilter
    logical_op: LogicalOp  # 与前一个条件的逻辑关系


class QueryParser:
    """查询语法解析器
    
    支持 ||/or (OR) 和 &&/and/空格 (AND) 逻辑运算符
    """
    
    # 正则匹配: field="value", field=="value", field!="value"
    FILTER_PATTERN = re.compile(r'(\w+)(==|!=|=)"([^"]*)"')
    
    # 逻辑运算符模式（带空格）
    OR_PATTERN = re.compile(r'\s*(\|\||(?<![a-zA-Z])or(?![a-zA-Z]))\s*', re.IGNORECASE)
    AND_PATTERN = re.compile(r'\s*(&&|(?<![a-zA-Z])and(?![a-zA-Z]))\s*', re.IGNORECASE)
    
    @classmethod
    def parse(cls, query_string: str) -> List[FilterGroup]:
        """解析查询语法字符串
        
        Args:
            query_string: 查询语法字符串
        
        Returns:
            解析后的过滤条件组列表
        
        Examples:
            >>> QueryParser.parse('type="xss" || type="sqli"')
            [FilterGroup(filter=..., logical_op=AND),  # 第一个默认 AND
             FilterGroup(filter=..., logical_op=OR)]
        """
        if not query_string or not query_string.strip():
            return []
        
        # 标准化逻辑运算符
        # 先处理 || 和 or -> __OR__
        normalized = cls.OR_PATTERN.sub(' __OR__ ', query_string)
        # 再处理 && 和 and -> __AND__
        normalized = cls.AND_PATTERN.sub(' __AND__ ', normalized)
        
        # 分词：按空格分割，保留逻辑运算符标记
        tokens = normalized.split()
        
        groups = []
        pending_op = LogicalOp.AND  # 默认 AND
        
        for token in tokens:
            if token == '__OR__':
                pending_op = LogicalOp.OR
            elif token == '__AND__':
                pending_op = LogicalOp.AND
            else:
                # 尝试解析为过滤条件
                match = cls.FILTER_PATTERN.match(token)
                if match:
                    field, operator, value = match.groups()
                    groups.append(FilterGroup(
                        filter=ParsedFilter(
                            field=field.lower(),
                            operator=operator,
                            value=value
                        ),
                        logical_op=pending_op if groups else LogicalOp.AND  # 第一个条件默认 AND
                    ))
                    pending_op = LogicalOp.AND  # 重置为默认 AND
        
        return groups


class QueryBuilder:
    """Django ORM 查询构建器
    
    将解析后的过滤条件转换为 Django ORM 查询，支持 AND/OR 逻辑
    """
    
    @classmethod
    def build_query(
        cls,
        queryset: QuerySet,
        filter_groups: List[FilterGroup],
        field_mapping: Dict[str, str]
    ) -> QuerySet:
        """构建 Django ORM 查询
        
        Args:
            queryset: Django QuerySet
            filter_groups: 解析后的过滤条件组列表
            field_mapping: 字段映射
        
        Returns:
            过滤后的 QuerySet
        """
        if not filter_groups:
            return queryset
        
        # 构建 Q 对象
        combined_q = None
        
        for group in filter_groups:
            f = group.filter
            
            # 字段映射
            db_field = field_mapping.get(f.field)
            if not db_field:
                logger.debug(f"忽略未知字段: {f.field}")
                continue
            
            # 构建单个条件的 Q 对象
            q = cls._build_single_q(db_field, f.operator, f.value)
            if q is None:
                continue
            
            # 组合 Q 对象
            if combined_q is None:
                combined_q = q
            elif group.logical_op == LogicalOp.OR:
                combined_q = combined_q | q
            else:  # AND
                combined_q = combined_q & q
        
        if combined_q is not None:
            return queryset.filter(combined_q)
        return queryset
    
    @classmethod
    def _build_single_q(cls, field: str, operator: str, value: str) -> Optional[Q]:
        """构建单个条件的 Q 对象"""
        if operator == '!=':
            return cls._build_not_equal_q(field, value)
        elif operator == '==':
            return cls._build_exact_q(field, value)
        else:  # '='
            return cls._build_fuzzy_q(field, value)
    
    @classmethod
    def _try_convert_to_int(cls, value: str) -> Optional[int]:
        """尝试将值转换为整数"""
        try:
            return int(value.strip())
        except (ValueError, TypeError):
            return None
    
    @classmethod
    def _build_fuzzy_q(cls, field: str, value: str) -> Q:
        """模糊匹配: 包含"""
        return Q(**{f'{field}__icontains': value})
    
    @classmethod
    def _build_exact_q(cls, field: str, value: str) -> Q:
        """精确匹配"""
        int_val = cls._try_convert_to_int(value)
        if int_val is not None:
            return Q(**{f'{field}__exact': int_val})
        return Q(**{f'{field}__exact': value})
    
    @classmethod
    def _build_not_equal_q(cls, field: str, value: str) -> Q:
        """不等于"""
        int_val = cls._try_convert_to_int(value)
        if int_val is not None:
            return ~Q(**{f'{field}__exact': int_val})
        return ~Q(**{f'{field}__exact': value})


def apply_filters(
    queryset: QuerySet,
    query_string: str,
    field_mapping: Dict[str, str]
) -> QuerySet:
    """应用过滤条件到 QuerySet
    
    Args:
        queryset: Django QuerySet
        query_string: 查询语法字符串
        field_mapping: 字段映射
    
    Returns:
        过滤后的 QuerySet
    
    Examples:
        # OR 查询
        apply_filters(qs, 'type="xss" || type="sqli"', mapping)
        apply_filters(qs, 'type="xss" or type="sqli"', mapping)
        
        # AND 查询
        apply_filters(qs, 'severity="high" && source="nuclei"', mapping)
        apply_filters(qs, 'severity="high" source="nuclei"', mapping)
        
        # 混合查询
        apply_filters(qs, 'type="xss" || type="sqli" && severity="high"', mapping)
    """
    if not query_string or not query_string.strip():
        return queryset
    
    try:
        filter_groups = QueryParser.parse(query_string)
        if not filter_groups:
            logger.debug(f"未解析到有效过滤条件: {query_string}")
            return queryset
        
        logger.debug(f"解析过滤条件: {filter_groups}")
        return QueryBuilder.build_query(queryset, filter_groups, field_mapping)
    
    except Exception as e:
        logger.warning(f"过滤解析错误: {e}, query: {query_string}")
        return queryset  # 静默降级
