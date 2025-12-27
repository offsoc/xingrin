"""
导出 URL 任务

用于指纹识别前导出目标下的 URL 到文件
支持懒加载模式：如果数据库为空，根据 Target 类型生成默认 URL
"""

import ipaddress
import importlib
import logging
from pathlib import Path

from prefect import task

logger = logging.getLogger(__name__)


# 数据源映射：source → (module_path, model_name, url_field)
SOURCE_MODEL_MAP = {
    'website': ('apps.asset.models', 'WebSite', 'url'),
    # 以后扩展：
    # 'endpoint': ('apps.asset.models', 'Endpoint', 'url'),
    # 'directory': ('apps.asset.models', 'Directory', 'url'),
}


def _get_model_class(source: str):
    """
    根据数据源类型获取 Model 类
    """
    if source not in SOURCE_MODEL_MAP:
        raise ValueError(f"不支持的数据源: {source}，支持的类型: {list(SOURCE_MODEL_MAP.keys())}")
    
    module_path, model_name, _ = SOURCE_MODEL_MAP[source]
    module = importlib.import_module(module_path)
    return getattr(module, model_name)


@task(name="export_urls_for_fingerprint")
def export_urls_for_fingerprint_task(
    target_id: int,
    output_file: str,
    target_name: str = None,
    source: str = 'website',
    batch_size: int = 1000
) -> dict:
    """
    导出目标下的 URL 到文件（用于指纹识别）
    
    支持多种数据源，预留扩展：
    - website: WebSite 表（当前实现）
    - endpoint: Endpoint 表（以后扩展）
    - directory: Directory 表（以后扩展）
    
    懒加载模式：
    - 如果数据库为空，根据 Target 类型生成默认 URL
    - DOMAIN: http(s)://domain
    - IP: http(s)://ip
    - CIDR: 展开为所有 IP 的 URL
    - URL: 直接使用目标 URL
    
    Args:
        target_id: 目标 ID
        output_file: 输出文件路径
        target_name: 目标名称（用于懒加载）
        source: 数据源类型
        batch_size: 批量读取大小
    
    Returns:
        dict: {'output_file': str, 'total_count': int, 'source': str}
    """
    from apps.targets.services import TargetService
    from apps.targets.models import Target
    
    logger.info("开始导出 URL - target_id=%s, source=%s, output=%s", target_id, source, output_file)
    
    Model = _get_model_class(source)
    _, _, url_field = SOURCE_MODEL_MAP[source]
    
    output_path = Path(output_file)
    
    # 分批导出
    total_count = 0
    with open(output_path, 'w', encoding='utf-8') as f:
        queryset = Model.objects.filter(target_id=target_id).values_list(url_field, flat=True)
        for url in queryset.iterator(chunk_size=batch_size):
            if url:
                f.write(url + '\n')
                total_count += 1
    
    # ==================== 懒加载模式：根据 Target 类型生成默认 URL ====================
    if total_count == 0:
        target_service = TargetService()
        target = target_service.get_target(target_id)
        
        if target:
            target_name = target.name
            target_type = target.type
            
            logger.info("懒加载模式：Target 类型=%s, 名称=%s", target_type, target_name)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                if target_type == Target.TargetType.DOMAIN:
                    f.write(f"http://{target_name}\n")
                    f.write(f"https://{target_name}\n")
                    total_count = 2
                    
                elif target_type == Target.TargetType.IP:
                    f.write(f"http://{target_name}\n")
                    f.write(f"https://{target_name}\n")
                    total_count = 2
                    
                elif target_type == Target.TargetType.CIDR:
                    try:
                        network = ipaddress.ip_network(target_name, strict=False)
                        for ip in network.hosts():
                            f.write(f"http://{ip}\n")
                            f.write(f"https://{ip}\n")
                            total_count += 2
                    except ValueError as e:
                        logger.warning("CIDR 解析失败: %s", e)
                        
                elif target_type == Target.TargetType.URL:
                    f.write(f"{target_name}\n")
                    total_count = 1
            
            logger.info("✓ 懒加载生成默认 URL - 数量: %d", total_count)
        else:
            logger.warning("Target ID %d 不存在，无法生成默认 URL", target_id)
    
    logger.info("✓ URL 导出完成 - 数量: %d, 文件: %s", total_count, output_file)
    
    return {
        'output_file': output_file,
        'total_count': total_count,
        'source': source
    }
