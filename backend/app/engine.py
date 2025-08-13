"""Domain calculation engine (Python) extracted from earlier design."""
from dataclasses import dataclass
from typing import Dict, Any, Callable, List, Optional
import math

# Minimal port (simplified) -- can be expanded later

@dataclass
class PipeSection:
    od: float
    id: float
    wt: float
    length: float
    md: float
    tvd: float
    grade: str = ""

class Engine:
    def calculate(self, payload: Dict[str, Any], find_tvd: Optional[Callable[[float], float]] = None) -> Dict[str, Any]:
        casing = PipeSection(**payload["casing"])  # expects keys od,id,wt,length,md,tvd
        liner = PipeSection(**payload["liner"])
        dp1 = PipeSection(**payload["dp1"])      
        dp2 = PipeSection(**payload.get("dp2", {"od":0,"id":0,"wt":0,"length":0,"md":0,"tvd":0,"grade":""}))
        mud_ppg = float(payload.get("mud", {}).get("ppg", 13.0))
        open_hole_id = float(payload.get("holeOverlap", {}).get("openHoleId", 8.5))

        def area_ft2(d_in: float) -> float:
            return math.pi * (d_in/12)**2 / 4

        annulus_area = max(0.0, area_ft2(open_hole_id) - area_ft2(liner.od))
        liner_overlap_ft = float(payload.get("holeOverlap", {}).get("linerOverlap", 300))
        shoe_track_ft = float(payload.get("holeOverlap", {}).get("shoeTrackLength", 200))
        cement_interval = liner_overlap_ft + shoe_track_ft
        BBL_PER_CUFT = 0.1781076
        cement_volume_bbl = annulus_area * cement_interval * BBL_PER_CUFT

        return {
            "cementVolume": cement_volume_bbl,
            "mudPPG": mud_ppg,
            "annulusAreaFt2": annulus_area,
        }

ENGINE = Engine()
