"""
Verificación de disponibilidad vía ICMP Ping.

Usa el binario 'ping' del sistema operativo (no un socket ICMP raw), por lo
que NO requiere privilegios de administrador/root y funciona igual en
Windows, Linux y macOS.
"""
import platform
import subprocess
import platform
import re
import subprocess

_TTL = re.compile(r"\bttl[=:]\s*\d+", re.IGNORECASE)

def ping_host(ip: str, timeout: int = 2, count: int = 1) -> bool:
    """True solo si la IP destino respondió con un echo reply real."""
    system = platform.system().lower()

    if system == "windows":
        cmd = ["ping", "-n", str(count), "-w", str(timeout * 1000), ip]
    elif system == "darwin":  # -W en milisegundos
        cmd = ["ping", "-c", str(count), "-W", str(timeout * 1000), ip]
    else:
        cmd = ["ping", "-c", str(count), "-W", str(timeout), ip]

    try:
        r = subprocess.run(
            cmd, capture_output=True, text=True, errors="ignore",
            timeout=timeout * count + 3,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return False

    if r.returncode != 0:
        return False
    if system == "windows":
        # exit code 0 también ocurre con "Host de destino inaccesible"
        return bool(_TTL.search(r.stdout))
    return True