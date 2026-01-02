"""
资产搜索物化视图刷新服务

提供物化视图刷新的核心逻辑：
- 设置刷新标志
- 执行物化视图刷新
- 防抖机制（10分钟内合并多次刷新请求）
"""

import logging
import time
from datetime import timedelta
from typing import Optional

from django.db import connection
from django.utils import timezone

logger = logging.getLogger(__name__)


class SearchRefreshService:
    """资产搜索物化视图刷新服务"""
    
    # 防抖时间（秒）
    DEBOUNCE_SECONDS = 600  # 10 分钟
    
    @staticmethod
    def mark_needs_refresh() -> bool:
        """
        标记物化视图需要刷新
        
        Returns:
            bool: 是否成功标记
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE asset_search_refresh_status 
                    SET needs_refresh = TRUE, updated_at = NOW()
                    WHERE id = 1
                """)
            logger.info("已标记物化视图需要刷新")
            return True
        except Exception as e:
            logger.error(f"标记刷新失败: {e}")
            return False
    
    @staticmethod
    def check_needs_refresh() -> bool:
        """
        检查是否需要刷新
        
        Returns:
            bool: 是否需要刷新
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT needs_refresh FROM asset_search_refresh_status WHERE id = 1
                """)
                row = cursor.fetchone()
                return row[0] if row else False
        except Exception as e:
            logger.error(f"检查刷新状态失败: {e}")
            return False
    
    @staticmethod
    def should_refresh_with_debounce() -> bool:
        """
        检查是否应该执行刷新（考虑防抖）
        
        防抖逻辑：
        - 如果 needs_refresh 为 True
        - 且距离上次刷新超过 10 分钟
        
        Returns:
            bool: 是否应该执行刷新
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT needs_refresh, last_refresh_at 
                    FROM asset_search_refresh_status 
                    WHERE id = 1
                """)
                row = cursor.fetchone()
                
                if not row:
                    return False
                
                needs_refresh, last_refresh_at = row
                
                if not needs_refresh:
                    return False
                
                # 如果从未刷新过，直接刷新
                if last_refresh_at is None:
                    return True
                
                # 检查防抖时间
                debounce_threshold = timezone.now() - timedelta(seconds=SearchRefreshService.DEBOUNCE_SECONDS)
                return last_refresh_at < debounce_threshold
                
        except Exception as e:
            logger.error(f"检查防抖状态失败: {e}")
            return False
    
    @staticmethod
    def refresh_materialized_view(concurrent: bool = True) -> dict:
        """
        刷新物化视图
        
        Args:
            concurrent: 是否使用 CONCURRENTLY 刷新（避免锁表）
        
        Returns:
            dict: 刷新结果，包含 success, duration_ms, error
        """
        start_time = time.time()
        result = {
            'success': False,
            'duration_ms': 0,
            'error': None
        }
        
        try:
            with connection.cursor() as cursor:
                # 执行刷新
                if concurrent:
                    cursor.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY asset_search_view")
                else:
                    cursor.execute("REFRESH MATERIALIZED VIEW asset_search_view")
                
                duration_ms = int((time.time() - start_time) * 1000)
                
                # 更新刷新状态
                cursor.execute("""
                    UPDATE asset_search_refresh_status 
                    SET needs_refresh = FALSE,
                        last_refresh_at = NOW(),
                        last_refresh_duration_ms = %s,
                        updated_at = NOW()
                    WHERE id = 1
                """, [duration_ms])
                
                result['success'] = True
                result['duration_ms'] = duration_ms
                
                logger.info(f"物化视图刷新成功，耗时 {duration_ms}ms")
                
        except Exception as e:
            result['error'] = str(e)
            result['duration_ms'] = int((time.time() - start_time) * 1000)
            logger.error(f"物化视图刷新失败: {e}")
        
        return result
    
    @staticmethod
    def get_refresh_status() -> Optional[dict]:
        """
        获取刷新状态
        
        Returns:
            dict: 刷新状态信息
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT needs_refresh, last_refresh_at, last_refresh_duration_ms, updated_at
                    FROM asset_search_refresh_status 
                    WHERE id = 1
                """)
                row = cursor.fetchone()
                
                if row:
                    return {
                        'needs_refresh': row[0],
                        'last_refresh_at': row[1],
                        'last_refresh_duration_ms': row[2],
                        'updated_at': row[3]
                    }
                return None
        except Exception as e:
            logger.error(f"获取刷新状态失败: {e}")
            return None
