# 扫描流程架构

## 完整扫描流程

```mermaid
flowchart TB
    START[Start Scan]
    TARGET[Input Target]
    
    START --> TARGET
    
    subgraph STAGE1["Stage 1: Discovery Sequential"]
        direction TB
        
        subgraph SUB["Subdomain Discovery"]
            direction TB
            SUBFINDER[subfinder]
            AMASS[amass]
            SUBLIST3R[sublist3r]
            ASSETFINDER[assetfinder]
            MERGE[Merge & Deduplicate]
            BRUTEFORCE[puredns bruteforce<br/>Dictionary Attack]
            MUTATE[dnsgen + puredns<br/>Mutation Generation]
            RESOLVE[puredns resolve<br/>Alive Verification]
            
            SUBFINDER --> MERGE
            AMASS --> MERGE
            SUBLIST3R --> MERGE
            ASSETFINDER --> MERGE
            MERGE --> BRUTEFORCE
            BRUTEFORCE --> MUTATE
            MUTATE --> RESOLVE
        end
        
        subgraph PORT["Port Scan"]
            NAABU[naabu<br/>Port Discovery]
        end
        
        subgraph SITE["Site Scan"]
            HTTPX1[httpx<br/>Web Service Detection]
        end
        
        RESOLVE --> NAABU
        NAABU --> HTTPX1
    end
    
    TARGET --> SUBFINDER
    TARGET --> AMASS
    TARGET --> SUBLIST3R
    TARGET --> ASSETFINDER
    
    subgraph STAGE2["Stage 2: Analysis Parallel"]
        direction TB
        
        subgraph URL["URL Collection"]
            direction TB
            WAYMORE[waymore<br/>Historical URLs]
            KATANA[katana<br/>Crawler]
            URO[uro<br/>URL Deduplication]
            HTTPX2[httpx<br/>Alive Verification]
            
            WAYMORE --> URO
            KATANA --> URO
            URO --> HTTPX2
        end
        
        subgraph DIR["Directory Scan"]
            FFUF[ffuf<br/>Directory Bruteforce]
        end
    end
    
    HTTPX1 --> WAYMORE
    HTTPX1 --> KATANA
    HTTPX1 --> FFUF
    
    subgraph STAGE3["Stage 3: Vulnerability Sequential"]
        direction TB
        
        subgraph VULN["Vulnerability Scan"]
            direction LR
            DALFOX[dalfox<br/>XSS Scan]
            NUCLEI[nuclei<br/>Vulnerability Scan]
        end
    end
    
    HTTPX2 --> DALFOX
    HTTPX2 --> NUCLEI
    
    DALFOX --> FINISH
    NUCLEI --> FINISH
    FFUF --> FINISH
    
    FINISH[Scan Complete]
    
    style START fill:#ff9999
    style FINISH fill:#99ff99
    style TARGET fill:#ffcc99
    style STAGE1 fill:#e6f3ff
    style STAGE2 fill:#fff4e6
    style STAGE3 fill:#ffe6f0
```

## 执行阶段定义

```python
# backend/apps/scan/configs/command_templates.py
EXECUTION_STAGES = [
    {'mode': 'sequential', 'flows': ['subdomain_discovery', 'port_scan', 'site_scan']},
    {'mode': 'parallel', 'flows': ['url_fetch', 'directory_scan']},
    {'mode': 'sequential', 'flows': ['vuln_scan']},
]
```

## 各阶段输出

| Flow | 工具 | 输出表 |
|------|------|--------|
| subdomain_discovery | subfinder, amass, sublist3r, assetfinder, puredns | Subdomain |
| port_scan | naabu | HostPortMapping |
| site_scan | httpx | WebSite |
| url_fetch | waymore, katana, uro, httpx | Endpoint |
| directory_scan | ffuf | Directory |
| vuln_scan | dalfox, nuclei | Vulnerability |
