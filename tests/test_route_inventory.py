"""Guard official route inventory against branch mixing and lost corridor stops.

Counts are intentionally checked only when a specific published timetable
provides an independently inspected station sequence.
"""
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REF=ROOT/'data/reference/network_stations.json'

class RouteInventoryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        doc=json.loads(REF.read_text(encoding='utf8'))
        cls.by_line={line:{x['name'] for x in doc['stations'] if line in x['lines']}
                     for line in ('R2','R2N','R2S','R8','RT2','RL3','RL4','R17')}
    def test_rt2_official_corridor(self):
        self.assertEqual(self.by_line['RT2'],{
            "L'Arboç","El Vendrell","Sant Vicenç de Calders",
            "Torredembarra","Altafulla-Tamarit","Tarragona","Salou - Port Aventura"})
    def test_r8_official_pdf_has_nine_stops(self):
        self.assertEqual(len(self.by_line['R8']),9)
        self.assertIn('Santa Perpètua de Mogoda Riera de Caldes',self.by_line['R8'])
    def test_r2_branches_not_equated(self):
        self.assertEqual(len(self.by_line['R2']),14)
        self.assertNotIn('Maçanet-Massanes',self.by_line['R2'])
        self.assertNotIn('Sant Vicenç de Calders',self.by_line['R2'])
        self.assertIn('Aeroport',self.by_line['R2N'])
        self.assertNotIn('Aeroport',self.by_line['R2'])
        self.assertIn('Barcelona-Estació de França',self.by_line['R2S'])
    def test_known_rl3_and_rl4_corridors(self):
        self.assertEqual(len(self.by_line['RL3']),9)
        self.assertEqual(len(self.by_line['RL4']),18)

if __name__=='__main__':unittest.main()
