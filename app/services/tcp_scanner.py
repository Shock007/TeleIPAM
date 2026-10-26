"""
Módulo NetworkScanner (sin Nmap): verificación vía Sockets TCP asíncronos.

IMPORTANTE: este módulo NUNCA se ejecuta de forma autónoma ni en el escaneo
por rango. Solo se invoca desde la consulta única, y únicamente si el
usuario aporta el PIN de autorización del proveedor
(ver app/services/authorization.py).
"""
import asyncio
import enum

class PortState(str, enum.Enum):
    OPEN = "open"          # handshake completo
    REFUSED = "refused"    # RST: algo respondió, el host está vivo
    TIMEOUT = "timeout"    # sin respuesta: caído o filtrado (DROP)

# Puertos estratégicos de ISP (routers, CPEs, mikrotik, servicios comunes).
DEFAULT_PORTS: list[int] = [80, 443, 8291, 22, 53, 8080, 23]


async def _check_port(ip: str, port: int, timeout: float) -> PortState:
    writer = None
    try:
        _, writer = await asyncio.wait_for(
            asyncio.open_connection(ip, port), timeout=timeout
        )
        return PortState.OPEN
    except ConnectionRefusedError:      # va ANTES de OSError (es subclase)
        return PortState.REFUSED
    except (asyncio.TimeoutError, OSError):
        return PortState.TIMEOUT
    finally:
        if writer is not None:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass

def host_responds(states: dict) -> bool:
    """True si algún puerto contestó (abierto o rechazado)."""
    return any(PortState(s) is not PortState.TIMEOUT for s in states.values())

async def scan_ports_async(ip: str, ports: list[int] | None = None,
                           timeout: float = 1.5) -> dict[int, PortState]:
    ports = ports or DEFAULT_PORTS
    tasks = {port: _check_port(ip, port, timeout) for port in ports}
    results = await asyncio.gather(*tasks.values())
    return dict(zip(tasks.keys(), results))


def scan_ports(ip: str, ports: list[int] | None = None,
               timeout: float = 1.5) -> dict[int, PortState]:
    """Wrapper síncrono, útil para llamarlo desde scripts/CLI o desde una
    vista síncrona sin tener que manejar el event loop manualmente."""
    return asyncio.run(scan_ports_async(ip, ports, timeout))