"""Standalone mathematical verification template using mpmath before Manim rendering."""
from __future__ import annotations

import math
import mpmath as mp

mp.mp.dps = 25


def is_prime(n: int) -> bool:
    if n < 2:
        return False
    for d in range(2, math.isqrt(n) + 1):
        if n % d == 0:
            return False
    return True


def verify_all() -> None:
    """Assert critical-line Riemann zeros, zeta(1/2), Basel sum, and prime checks."""
    for k in range(1, 13):
        gk = mp.im(mp.zetazero(k))
        mag = abs(mp.zeta(0.5 + 1j * gk))
        assert mag < 1e-12, f"Zero #{k} verification failed at t={gk}: |zeta|={mag}"

    z_half = mp.zeta(mp.mpf("0.5"))
    assert abs(z_half - mp.mpf("-1.4603545088095868")) < 1e-12

    partial_sum = sum(1.0 / (n * n) for n in range(1, 20001))
    basel = float(mp.pi ** 2 / 6)
    assert abs(partial_sum - basel) < 1e-4
    assert abs(mp.zeta(2) - mp.pi ** 2 / 6) < 1e-12

    for p in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]:
        assert is_prime(p)

    print("MATH_CORE_VERIFIED: 12 Riemann zeros (<1e-12), zeta(1/2), zeta(2)=pi^2/6, primes OK")


if __name__ == "__main__":
    verify_all()
