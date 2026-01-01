import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class AssetConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.asset'
    
    def ready(self):
        # 导入所有模型以确保Django发现并注册
        from . import models
        
        # 启用 pg_trgm 扩展（用于文本模糊搜索索引）
        # 用于已有数据库升级场景
        self._ensure_pg_trgm_extension()
    
    def _ensure_pg_trgm_extension(self):
        """
        确保 pg_trgm 扩展已启用。
        该扩展用于 response_body 和 response_headers 字段的 GIN 索引，
        支持高效的文本模糊搜索。
        """
        from django.db import connection
        
        # 检查是否为 PostgreSQL 数据库
        if connection.vendor != 'postgresql':
            logger.debug("跳过 pg_trgm 扩展：当前数据库不是 PostgreSQL")
            return
        
        try:
            with connection.cursor() as cursor:
                cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
                logger.debug("pg_trgm 扩展已启用")
        except Exception as e:
            # 记录错误但不阻止应用启动
            # 常见原因：权限不足（需要超级用户权限）
            logger.warning(
                "无法创建 pg_trgm 扩展: %s。"
                "这可能导致 response_body 和 response_headers 字段的 GIN 索引无法正常工作。"
                "请手动执行: CREATE EXTENSION IF NOT EXISTS pg_trgm;",
                str(e)
            )
