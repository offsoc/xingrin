"""导出 Endpoint URL 到文件的 Task

使用 TargetExportService 统一处理导出逻辑和默认值回退

数据源优先级（回退链）：
1. Endpoint.url - 最精细的 URL（含路径、参数等）
2. WebSite.url - 站点级别 URL
3. 默认生成 - 根据 Target 类型生成 http(s)://target_name
"""

import logging
from pathlib import Path
from typing import Dict

from prefect import task

from apps.asset.models import Endpoint, WebSite
from apps.scan.services.target_export_service import create_export_service

logger = logging.getLogger(__name__)


@task(name="export_endpoints")
def export_endpoints_task(
    target_id: int,
    output_file: str,
    batch_size: int = 1000,
) -> Dict[str, object]:
    """导出目标下的所有 Endpoint URL 到文本文件。

    数据源优先级（回退链）：
    1. Endpoint 表 - 最精细的 URL（含路径、参数等）
    2. WebSite 表 - 站点级别 URL
    3. 默认生成 - 根据 Target 类型生成 http(s)://target_name

    Args:
        target_id: 目标 ID
        output_file: 输出文件路径（绝对路径）
        batch_size: 每次从数据库迭代的批大小

    Returns:
        dict: {
            "success": bool,
            "output_file": str,
            "total_count": int,
            "source": str,  # 数据来源: "endpoint" | "website" | "default"
        }
    """
    export_service = create_export_service(target_id)
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 1. 优先从 Endpoint 表导出
    endpoint_queryset = Endpoint.objects.filter(target_id=target_id).values_list('url', flat=True)
    result = export_service.export_urls(
        target_id=target_id,
        output_path=output_file,
        queryset=endpoint_queryset,
        batch_size=batch_size
    )
    
    if result['total_count'] > 0:
        logger.info("从 Endpoint 表导出 %d 条 URL", result['total_count'])
        return {
            "success": True,
            "output_file": result['output_file'],
            "total_count": result['total_count'],
            "source": "endpoint",
        }
    
    # 2. Endpoint 为空，回退到 WebSite 表
    logger.info("Endpoint 表为空，回退到 WebSite 表")
    website_queryset = WebSite.objects.filter(target_id=target_id).values_list('url', flat=True)
    result = export_service.export_urls(
        target_id=target_id,
        output_path=output_file,
        queryset=website_queryset,
        batch_size=batch_size
    )
    
    if result['total_count'] > 0:
        logger.info("从 WebSite 表导出 %d 条 URL", result['total_count'])
        return {
            "success": True,
            "output_file": result['output_file'],
            "total_count": result['total_count'],
            "source": "website",
        }
    
    # 3. WebSite 也为空，生成默认 URL（export_urls 内部已处理）
    logger.info("WebSite 表也为空，使用默认 URL 生成")
    return {
        "success": True,
        "output_file": result['output_file'],
        "total_count": result['total_count'],
        "source": "default",
    }
