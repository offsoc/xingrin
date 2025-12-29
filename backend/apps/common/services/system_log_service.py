"""
系统日志服务模块

提供系统日志的读取功能，支持：
- 从日志目录读取日志文件
- 限制返回行数，防止内存溢出
"""

import logging
import subprocess


logger = logging.getLogger(__name__)


class SystemLogService:
    """
    系统日志服务类
    
    负责读取系统日志文件，支持从容器内路径或宿主机挂载路径读取日志。
    """
    
    def __init__(self):
        # 日志文件路径（统一使用 /opt/xingrin/logs）
        self.log_file = "/opt/xingrin/logs/xingrin.log"
        self.default_lines = 200        # 默认返回行数
        self.max_lines = 10000          # 最大返回行数限制
        self.timeout_seconds = 3        # tail 命令超时时间

    def get_logs_content(self, lines: int | None = None) -> str:
        """
        获取系统日志内容
        
        Args:
            lines: 返回的日志行数，默认 200 行，最大 10000 行
            
        Returns:
            str: 日志内容，每行以换行符分隔，保持原始顺序
        """
        # 参数校验和默认值处理
        if lines is None:
            lines = self.default_lines

        lines = int(lines)
        if lines < 1:
            lines = 1
        if lines > self.max_lines:
            lines = self.max_lines

        # 使用 tail 命令读取日志文件末尾内容
        cmd = ["tail", "-n", str(lines), self.log_file]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=self.timeout_seconds,
            check=False,
        )

        if result.returncode != 0:
            logger.warning(
                "tail command failed: returncode=%s stderr=%s",
                result.returncode,
                (result.stderr or "").strip(),
            )

        # 直接返回原始内容，保持文件中的顺序
        return result.stdout or ""
