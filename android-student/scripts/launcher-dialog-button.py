#!/usr/bin/env python3
"""Locate only the emulator Pixel Launcher ANR close button, never a Dena ANR."""
import re
import sys
import xml.etree.ElementTree as ET

try:
    root = ET.parse(sys.argv[1]).getroot()
except (OSError, ET.ParseError):
    sys.exit(0)
if not any(node.get('resource-id') == 'android:id/alertTitle'
           and node.get('text') == "Pixel Launcher isn't responding"
           for node in root.iter('node')):
    sys.exit(0)
for node in root.iter('node'):
    if node.get('resource-id') == 'android:id/aerr_close':
        match = re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', node.get('bounds', ''))
        if match:
            left, top, right, bottom = map(int, match.groups())
            print((left + right) // 2, (top + bottom) // 2)
        break
