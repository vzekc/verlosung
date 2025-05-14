#!/usr/bin/env python3

"""
    Python Skript zum neutralen Verlosen:
    https://www.classic-computing.org/alte-computer-immer-her-damit/
    https://github.com/jedie/python-code-snippets/blob/master/CodeSnippets/VzEkC-verlosung.py
"""

import difflib
import hashlib
import json
import os
import random
import sys
from collections import Counter
from datetime import datetime, timezone
from typing import Dict, List


class VzEkC:
    def __init__(self, title: str, timestamp: str, packets: List[Dict]):
        """
        Initialize the lottery system.
        
        Args:
            title: Title of the tombola
            timestamp: ISO-8601 timestamp for randomization
            packets: List of packets with participants and their tickets
        """
        self.title = title
        self.timestamp = timestamp
        self.drawings = []
        self.results = {
            "title": title,
            "timestamp": timestamp,  # Original timestamp from input
            "drawingTimestamp": None,  # Will be set when drawing happens
            "rngSeed": None,  # Will be set when RNG is initialized
            "packets": []
        }
        
        # Convert the new format to the internal format
        for packet in packets:
            names = []
            for participant in packet['participants']:
                # Add each name as many times as they have tickets
                names.extend([participant['name']] * participant['tickets'])
            
            self.drawings.append({
                'text': packet['title'],
                'names': names,
                'original_packet': packet
            })
        
        self.drawings = sorted(self.drawings, key=lambda x: x['text'])
        self.rnd = self._get_random(timestamp)

    def out(self, *args):
        print(*args)

    def _get_random(self, timestamp: str):
        """
        Create a pseudo-random object based on the timestamp and participant names.
        Accepts only ISO-8601 timestamps with a local offset (not UTC or Z).
        Always converts to UTC Unix timestamp string for seeding.
        """
        # Parse as ISO-8601 and convert to UTC Unix timestamp string
        dt = datetime.fromisoformat(timestamp)
        if dt.tzinfo is not None:
            dt_utc = dt.astimezone(timezone.utc)
        else:
            raise ValueError("Timestamp must include a timezone offset, e.g. 2025-01-25T13:32:00+01:00")
        timestamp_str = str(int(dt_utc.timestamp()))
        
        # Start hash with the timestamp
        m = hashlib.sha3_512()
        m.update(bytes(timestamp_str, encoding='ASCII'))

        # Include all participant names (sorted) in the hash value
        all_names = set()
        for data in self.drawings:
            for name in sorted(data['names']):
                all_names.add(name)
                m.update(bytes(name, encoding='UTF-8'))

        # Get seed value for verification
        self.seed = m.hexdigest()
        self.results["rngSeed"] = self.seed
        return random.Random(self.seed)

    def _print_result(self, *, text, names, original_packet):
        """
        Prints the result for one packet and updates the results dictionary.
        """
        names.sort()  # Sort all names
        c = Counter(names)
        
        # Print participants and winner in a simple format
        participants = [f"{user} ({count})" for user, count in c.items()]
        winner = self.rnd.choice(names)
        self.out(f"{text}: {', '.join(participants)} → {winner}")

        # Update results dictionary
        packet_result = original_packet.copy()
        packet_result['winner'] = winner
        self.results['packets'].append(packet_result)

    def print_drawing(self):
        """
        Print the drawing results and save to JSON file.
        """
        # Print header
        dt = datetime.fromisoformat(self.timestamp)
        dt_utc = dt.astimezone(timezone.utc)
        epoch_time = int(dt_utc.timestamp())
        drawing_timestamp = datetime.now(dt.tzinfo).isoformat()
        self.results["drawingTimestamp"] = drawing_timestamp
        
        self.out(f"{self.title}")
        self.out(f"Zeitpunkt: {self.timestamp} ({epoch_time})")
        self.out(f"Seed: {self.seed}")
        self.out()

        # Print results for each packet
        for drawing in self.drawings:
            self._print_result(**drawing)

        # Save results to JSON file
        input_basename = os.path.splitext(sys.argv[1])[0]
        output_file = f"{input_basename}-results.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=4, ensure_ascii=False)
        self.out(f'\nErgebnisse wurden in {output_file} gespeichert.')


def load_lottery_data(json_file: str) -> Dict:
    """Load lottery data from a JSON file."""
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File '{json_file}' not found.", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: File '{json_file}' contains invalid JSON.", file=sys.stderr)
        sys.exit(1)

def create_example_json():
    """Create an example JSON file for the lottery."""
    example_data = {
        "title": "Classic Computing Tombola 2024",
        "timestamp": "2024-03-20T15:00:00+01:00",
        "packets": [
            {
                "title": "Paket #1 SS2",
                "participants": [
                    {"name": "@obsd_guru", "tickets": 1},
                    {"name": "@tuti", "tickets": 2},
                    {"name": "@Cobalt60", "tickets": 1},
                    {"name": "@gnupublic", "tickets": 1}
                ]
            },
            {
                "title": "Paket #2 SS10",
                "participants": [
                    {"name": "@obsd_guru", "tickets": 1},
                    {"name": "@tuti", "tickets": 1},
                    {"name": "@Cobalt60", "tickets": 1},
                    {"name": "@gnupublic", "tickets": 1}
                ]
            }
        ]
    }
    
    with open('example_lottery.json', 'w', encoding='utf-8') as f:
        json.dump(example_data, f, indent=4, ensure_ascii=False)
    print("Created example_lottery.json")


def test_lottery():
    """

    """
    class TestVzEkC(VzEkC):
        buffer = []

        def out(self, *args):
            self.buffer.append(' '.join(str(arg) for arg in args))

    def unified_diff(txt1, txt2):
        return '\n'.join(
            difflib.unified_diff(txt1.splitlines(), txt2.splitlines())
        )

    lottery = TestVzEkC(
        drawings=[
            {
                'text': 'Paket Nr. 1',
                'names': [
                    'Mr.Bar',
                    'Mr.Foo', 'Mr.Foo', 'Mr.Foo',
                    'Mr.Schmidt', 'Mr.Schmidt',
                ]
            },
            {'text': 'Paket Nr. 2', 'names': ['Mr.Schmidt', 'Mr.Foo', 'Mr.Bar']},
            {'text': 'Paket Nr. 3', 'names': ['Mr.Schmidt', 'Mr.Foo', 'Mr.Bar']},
            # Pakete werden automatisch nach Namen sortiert:
            {'text': 'Paket Nr. 5', 'names': ['Mr.Schmidt', 'Mr.Foo', 'Mr.Bar']},
            {'text': 'Paket Nr. 4', 'names': ['Mr.Schmidt', 'Mr.Foo', 'Mr.Bar']},
        ],
        post_timestamp='1601933809'
    )
    lottery.print_drawing()
    output = '\n'.join(lottery.buffer)
    diff = unified_diff(output, """
Alle Teilnehmer: Mr.Bar, Mr.Foo, Mr.Schmidt
(Use pseudo-random number generator Version 3 with seed='2ed05778e97b0f4497673ac0994c05964c0df25ae92e5f0cf97dbb02ef06850829b74f2e2c3cce0edb2454efaa6e3c5ac228a219a3cc838cff9db81765c02386')
____________________________________________________________________________________________________
Verlosung von: *** Paket Nr. 1 ***
 * Mr.Bar hat 1 Lose gekauft
 * Mr.Foo hat 3 Lose gekauft
 * Mr.Schmidt hat 2 Lose gekauft
Alle Lose/Namen im Topf: ['Mr.Bar', 'Mr.Foo', 'Mr.Foo', 'Mr.Foo', 'Mr.Schmidt', 'Mr.Schmidt']
Gewinner ist: *** Mr.Bar ***
____________________________________________________________________________________________________
Verlosung von: *** Paket Nr. 2 ***
 * Mr.Bar hat 1 Lose gekauft
 * Mr.Foo hat 1 Lose gekauft
 * Mr.Schmidt hat 1 Lose gekauft
Alle Lose/Namen im Topf: ['Mr.Bar', 'Mr.Foo', 'Mr.Schmidt']
Gewinner ist: *** Mr.Bar ***
____________________________________________________________________________________________________
Verlosung von: *** Paket Nr. 3 ***
 * Mr.Bar hat 1 Lose gekauft
 * Mr.Foo hat 1 Lose gekauft
 * Mr.Schmidt hat 1 Lose gekauft
Alle Lose/Namen im Topf: ['Mr.Bar', 'Mr.Foo', 'Mr.Schmidt']
Gewinner ist: *** Mr.Schmidt ***
____________________________________________________________________________________________________
Verlosung von: *** Paket Nr. 4 ***
 * Mr.Bar hat 1 Lose gekauft
 * Mr.Foo hat 1 Lose gekauft
 * Mr.Schmidt hat 1 Lose gekauft
Alle Lose/Namen im Topf: ['Mr.Bar', 'Mr.Foo', 'Mr.Schmidt']
Gewinner ist: *** Mr.Schmidt ***
____________________________________________________________________________________________________
Verlosung von: *** Paket Nr. 5 ***
 * Mr.Bar hat 1 Lose gekauft
 * Mr.Foo hat 1 Lose gekauft
 * Mr.Schmidt hat 1 Lose gekauft
Alle Lose/Namen im Topf: ['Mr.Bar', 'Mr.Foo', 'Mr.Schmidt']
Gewinner ist: *** Mr.Schmidt ***
    """.strip())
    if diff:
        raise AssertionError(diff)
    print("\nSelf test OK\n")


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--create-example':
        create_example_json()
        sys.exit(0)
        
    if len(sys.argv) != 2:
        print("Usage: python verlosung.py <json_file>")
        print("       python verlosung.py --create-example")
        sys.exit(1)
        
    data = load_lottery_data(sys.argv[1])
    lottery = VzEkC(
        title=data['title'],
        timestamp=data['timestamp'],
        packets=data['packets']
    )
    lottery.print_drawing()
