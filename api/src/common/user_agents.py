def device_label_for_user_agent(user_agent: str | None) -> str:
    value = (user_agent or "").lower()
    browser = None
    platform = None

    if "edg/" in value:
        browser = "Edge"
    elif "chrome/" in value:
        browser = "Chrome"
    elif "firefox/" in value:
        browser = "Firefox"
    elif "safari/" in value:
        browser = "Safari"

    if "iphone" in value:
        platform = "iPhone"
    elif "ipad" in value:
        platform = "iPad"
    elif "android" in value:
        platform = "Android"
    elif "windows" in value:
        platform = "Windows"
    elif "macintosh" in value or "mac os x" in value:
        platform = "macOS"
    elif "linux" in value:
        platform = "Linux"

    if browser and platform:
        return f"{browser} on {platform}"
    return browser or platform or "Unknown device"
