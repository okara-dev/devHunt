import platform
import socket
import psutil


def get_system_info(info_type: str = "all") -> str:
    if info_type == "cpu":
        return _cpu()
    if info_type == "ram":
        return _ram()
    if info_type == "battery":
        return _battery()
    if info_type == "disk":
        return _disk()
    if info_type == "network":
        return _network()

    parts = [_cpu(), _ram(), _battery(), _disk(), _network()]
    return " | ".join(p for p in parts if p)


def _cpu() -> str:
    usage = psutil.cpu_percent(interval=0.5)
    cores = psutil.cpu_count(logical=True)
    freq = psutil.cpu_freq()
    freq_str = f", {freq.current:.0f} MHz" if freq else ""
    return f"CPU: {usage}% ({cores} Kerne{freq_str})"


def _ram() -> str:
    mem = psutil.virtual_memory()
    free_gb = mem.available / (1024 ** 3)
    total_gb = mem.total / (1024 ** 3)
    return f"RAM: {free_gb:.1f} GB frei von {total_gb:.1f} GB ({mem.percent}% belegt)"


def _battery() -> str:
    bat = psutil.sensors_battery()
    if bat is None:
        return "Akku: keine Batterie erkannt"
    status = "lädt" if bat.power_plugged else "entlädt"
    secs = bat.secsleft
    if secs and secs > 0:
        h, m = divmod(secs // 60, 60)
        return f"Akku: {bat.percent:.0f}% ({status}, noch {h}h {m}m)"
    return f"Akku: {bat.percent:.0f}% ({status})"


def _disk() -> str:
    disk = psutil.disk_usage("/")
    free_gb = disk.free / (1024 ** 3)
    total_gb = disk.total / (1024 ** 3)
    return f"Festplatte: {free_gb:.1f} GB frei von {total_gb:.1f} GB"


def _network() -> str:
    hostname = socket.gethostname()
    try:
        ip = socket.gethostbyname(hostname)
    except Exception:
        ip = "unbekannt"
    return f"Netzwerk: {hostname} ({ip})"