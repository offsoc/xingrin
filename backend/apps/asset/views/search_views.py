"""
资产搜索 API 视图

提供资产搜索的 REST API 接口：
- GET /api/assets/search/ - 搜索资产
"""

import logging
import json
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.request import Request

from apps.common.response_helpers import success_response, error_response
from apps.common.error_codes import ErrorCodes
from apps.asset.services.search_service import AssetSearchService

logger = logging.getLogger(__name__)


class AssetSearchView(APIView):
    """
    资产搜索 API
    
    GET /api/assets/search/
    
    Query Parameters:
        host: 主机名模糊匹配
        title: 标题模糊匹配
        tech: 技术栈匹配
        status: 状态码匹配（支持逗号分隔多值，如 "200,301"）
        body: 响应体模糊匹配
        header: 响应头模糊匹配
        url: URL 模糊匹配
        page: 页码（从 1 开始，默认 1）
        pageSize: 每页数量（默认 10，最大 100）
    
    Response:
        {
            "results": [...],
            "total": 100,
            "page": 1,
            "pageSize": 10,
            "totalPages": 10
        }
    """
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = AssetSearchService()
    
    def get(self, request: Request):
        """搜索资产"""
        # 获取搜索参数
        host = request.query_params.get('host', '').strip() or None
        title = request.query_params.get('title', '').strip() or None
        tech = request.query_params.get('tech', '').strip() or None
        status_param = request.query_params.get('status', '').strip() or None
        body = request.query_params.get('body', '').strip() or None
        header = request.query_params.get('header', '').strip() or None
        url = request.query_params.get('url', '').strip() or None
        
        # 检查是否有搜索条件
        if not any([host, title, tech, status_param, body, header, url]):
            return error_response(
                code=ErrorCodes.VALIDATION_ERROR,
                message='At least one search parameter is required',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取分页参数
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('pageSize', 10))
        except (ValueError, TypeError):
            page = 1
            page_size = 10
        
        # 限制分页参数
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        
        try:
            # 获取总数
            total = self.service.count(
                host=host,
                title=title,
                tech=tech,
                status=status_param,
                body=body,
                header=header,
                url=url,
            )
            
            # 计算分页
            total_pages = (total + page_size - 1) // page_size if total > 0 else 1
            offset = (page - 1) * page_size
            
            # 获取搜索结果
            all_results = self.service.search(
                host=host,
                title=title,
                tech=tech,
                status=status_param,
                body=body,
                header=header,
                url=url,
            )
            
            # 手动分页
            results = all_results[offset:offset + page_size]
            
            # 格式化结果
            formatted_results = []
            for result in results:
                # 解析响应头为字典
                response_headers = {}
                if result.get('response_headers'):
                    try:
                        # 尝试解析为 JSON
                        response_headers = json.loads(result['response_headers'])
                    except (json.JSONDecodeError, TypeError):
                        # 如果不是 JSON，尝试解析为 HTTP 头格式
                        headers_str = result['response_headers']
                        for line in headers_str.split('\n'):
                            if ':' in line:
                                key, value = line.split(':', 1)
                                response_headers[key.strip()] = value.strip()
                
                # 解析漏洞列表
                vulnerabilities = result.get('vulnerabilities', [])
                if isinstance(vulnerabilities, str):
                    try:
                        vulnerabilities = json.loads(vulnerabilities)
                    except (json.JSONDecodeError, TypeError):
                        vulnerabilities = []
                
                formatted_results.append({
                    'url': result.get('url', ''),
                    'host': result.get('host', ''),
                    'title': result.get('title', ''),
                    'technologies': result.get('tech', []) or [],
                    'statusCode': result.get('status_code'),
                    'responseHeaders': response_headers,
                    'responseBody': result.get('response_body', ''),
                    'vulnerabilities': vulnerabilities or [],
                })
            
            return success_response(data={
                'results': formatted_results,
                'total': total,
                'page': page,
                'pageSize': page_size,
                'totalPages': total_pages,
            })
            
        except Exception as e:
            logger.exception("搜索失败")
            return error_response(
                code=ErrorCodes.SERVER_ERROR,
                message='Search failed',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
