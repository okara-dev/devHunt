"""
QuickChart – Charts als Bild generieren
Kostenlos, kein Key nötig
"""

import json
from urllib.parse import quote

class QuickChartAPI:
    def __init__(self):
        self.base_url = "https://quickchart.io/chart"
    
    def generate_bar_chart(self, labels, data, title="Chart"):
        """Generiert ein Balkendiagramm"""
        chart_config = {
            "type": "bar",
            "data": {
                "labels": labels,
                "datasets": [{
                    "label": title,
                    "data": data,
                    "backgroundColor": "rgba(79, 70, 229, 0.7)",
                    "borderColor": "rgba(79, 70, 229, 1)",
                    "borderWidth": 1
                }]
            },
            "options": {
                "title": {"display": True, "text": title}
            }
        }
        return self._build_url(chart_config)
    
    def generate_line_chart(self, labels, data, title="Chart"):
        """Generiert ein Liniendiagramm"""
        chart_config = {
            "type": "line",
            "data": {
                "labels": labels,
                "datasets": [{
                    "label": title,
                    "data": data,
                    "borderColor": "rgba(79, 70, 229, 1)",
                    "backgroundColor": "rgba(79, 70, 229, 0.2)",
                    "fill": True,
                    "tension": 0.4
                }]
            },
            "options": {
                "title": {"display": True, "text": title}
            }
        }
        return self._build_url(chart_config)
    
    def generate_pie_chart(self, labels, data, title="Chart"):
        """Generiert ein Kreisdiagramm"""
        colors = [
            "rgba(79, 70, 229, 0.7)",
            "rgba(237, 100, 166, 0.7)",
            "rgba(56, 161, 105, 0.7)",
            "rgba(214, 158, 46, 0.7)",
            "rgba(49, 130, 206, 0.7)"
        ]
        chart_config = {
            "type": "pie",
            "data": {
                "labels": labels,
                "datasets": [{
                    "data": data,
                    "backgroundColor": colors[:len(labels)]
                }]
            },
            "options": {
                "title": {"display": True, "text": title}
            }
        }
        return self._build_url(chart_config)
    
    def _build_url(self, chart_config):
        """Baut die QuickChart-URL"""
        config_json = json.dumps(chart_config)
        encoded = quote(config_json)
        return f"{self.base_url}?c={encoded}&w=600&h=400&bkg=white"