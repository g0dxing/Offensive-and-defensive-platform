#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
下载静态资源文件
"""
import os
import requests

def download_file(url, local_path):
    """下载文件到本地"""
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    
    print(f"正在下载: {url} -> {local_path}")
    response = requests.get(url)
    with open(local_path, 'wb') as f:
        f.write(response.content)
    print(f"下载完成: {local_path}")

def main():
    # Tailwind CSS
    download_file(
        "https://cdn.tailwindcss.com",
        "static/js/tailwind.js"
    )
    
    # Font Awesome CSS
    download_file(
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
        "static/css/font-awesome.css"
    )
    
    # Socket.IO
    download_file(
        "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.2/socket.io.js",
        "static/js/socket.io.js"
    )
    
    # Axios
    download_file(
        "https://cdnjs.cloudflare.com/ajax/libs/axios/1.5.0/axios.min.js",
        "static/js/axios.min.js"
    )
    
    # 下载 Font Awesome 字体文件
    webfonts = [
        "fa-brands-400.woff2",
        "fa-regular-400.woff2", 
        "fa-solid-900.woff2",
        "fa-v4compatibility.woff2"
    ]
    
    for font in webfonts:
        download_file(
            f"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/{font}",
            f"static/webfonts/{font}"
        )
    
    print("所有静态资源下载完成！")

if __name__ == '__main__':
    main()
