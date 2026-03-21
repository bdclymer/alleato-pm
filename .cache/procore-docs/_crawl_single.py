
import sys, json, asyncio, os, warnings
warnings.filterwarnings("ignore")
os.environ["CRAWL4AI_LOG_LEVEL"] = "ERROR"

async def crawl_url(url):
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
    import logging
    logging.getLogger("crawl4ai").setLevel(logging.ERROR)

    browser_config = BrowserConfig(headless=True, verbose=False)
    run_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        wait_until="networkidle",
        page_timeout=30000,
        excluded_tags=["nav", "footer", "header", "script", "style", "noscript"],
        remove_overlay_elements=True,
        verbose=False,
    )

    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url=url, config=run_config)
        if result.success:
            return {
                "success": True,
                "markdown": result.markdown_v2.raw_markdown if hasattr(result, 'markdown_v2') and result.markdown_v2 else result.markdown,
                "title": result.metadata.get("title", "") if result.metadata else "",
                "description": result.metadata.get("description", "") if result.metadata else "",
            }
        else:
            return {"success": False, "error": result.error_message or "Unknown error"}

url = sys.argv[1]
result = asyncio.run(crawl_url(url))
print("---CRAWL4AI_JSON---")
print(json.dumps(result))
