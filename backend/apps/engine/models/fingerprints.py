"""指纹相关 Models

包含 EHole、Goby、Wappalyzer 等指纹格式的数据模型
"""

from django.db import models


class GobyFingerprint(models.Model):
    """Goby 格式指纹规则
    
    Goby 使用逻辑表达式和规则数组进行匹配：
    - logic: 逻辑表达式，如 "a||b", "(a&&b)||c"
    - rule: 规则数组，每条规则包含 label, feature, is_equal
    """
    
    name = models.CharField(max_length=300, unique=True, help_text='产品名称')
    logic = models.CharField(max_length=500, help_text='逻辑表达式')
    rule = models.JSONField(default=list, help_text='规则数组')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'goby_fingerprint'
        verbose_name = 'Goby 指纹'
        verbose_name_plural = 'Goby 指纹'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['logic']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self) -> str:
        return f"{self.name} ({self.logic})"


class EholeFingerprint(models.Model):
    """EHole 格式指纹规则（字段与 ehole.json 一致）"""
    
    cms = models.CharField(max_length=200, help_text='产品/CMS名称')
    method = models.CharField(max_length=200, default='keyword', help_text='匹配方式')
    location = models.CharField(max_length=200, default='body', help_text='匹配位置')
    keyword = models.JSONField(default=list, help_text='关键词列表')
    is_important = models.BooleanField(default=False, help_text='是否重点资产')
    type = models.CharField(max_length=100, blank=True, default='-', help_text='分类')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ehole_fingerprint'
        verbose_name = 'EHole 指纹'
        verbose_name_plural = 'EHole 指纹'
        ordering = ['-created_at']
        indexes = [
            # 搜索过滤字段索引
            models.Index(fields=['cms']),
            models.Index(fields=['method']),
            models.Index(fields=['location']),
            models.Index(fields=['type']),
            models.Index(fields=['is_important']),
            # 排序字段索引
            models.Index(fields=['-created_at']),
        ]
        constraints = [
            # 唯一约束：cms + method + location 组合不能重复
            models.UniqueConstraint(
                fields=['cms', 'method', 'location'],
                name='unique_ehole_fingerprint'
            ),
        ]
    
    def __str__(self) -> str:
        return f"{self.cms} ({self.method}@{self.location})"


class WappalyzerFingerprint(models.Model):
    """Wappalyzer 格式指纹规则
    
    Wappalyzer 支持多种检测方式：cookies, headers, scriptSrc, js, meta, html 等
    """
    
    name = models.CharField(max_length=300, unique=True, help_text='应用名称')
    cats = models.JSONField(default=list, help_text='分类 ID 数组')
    cookies = models.JSONField(default=dict, blank=True, help_text='Cookie 检测规则')
    headers = models.JSONField(default=dict, blank=True, help_text='HTTP Header 检测规则')
    script_src = models.JSONField(default=list, blank=True, help_text='脚本 URL 正则数组')
    js = models.JSONField(default=list, blank=True, help_text='JavaScript 变量检测规则')
    implies = models.JSONField(default=list, blank=True, help_text='依赖关系数组')
    meta = models.JSONField(default=dict, blank=True, help_text='HTML meta 标签检测规则')
    html = models.JSONField(default=list, blank=True, help_text='HTML 内容正则数组')
    description = models.TextField(blank=True, default='', help_text='应用描述')
    website = models.URLField(max_length=500, blank=True, default='', help_text='官网链接')
    cpe = models.CharField(max_length=300, blank=True, default='', help_text='CPE 标识符')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'wappalyzer_fingerprint'
        verbose_name = 'Wappalyzer 指纹'
        verbose_name_plural = 'Wappalyzer 指纹'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['website']),
            models.Index(fields=['cpe']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self) -> str:
        return f"{self.name}"
