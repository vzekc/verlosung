import { Lottery } from './lottery.js';

// Example lottery data
const exampleData = {
    "title": "Classic Computing Tombola 2024",
    "timestamp": "2025-01-25T11:52:00+00:00",
    "packets": [
        {
            "title": "Paket #1 SS2",
            "participants": [
                {"name": "@obsd_guru", "tickets": 1},
                {"name": "@tuti", "tickets": 1},
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
        },
        {
            "title": "Paket #3 V4K+Disks",
            "participants": [
                {"name": "@Hans", "tickets": 1},
                {"name": "@Schroeder", "tickets": 1},
                {"name": "@obsd_guru", "tickets": 1},
                {"name": "@gnupublic", "tickets": 1}
            ]
        },
        {
            "title": "Paket #4 V4K",
            "participants": [
                {"name": "@Hans", "tickets": 1},
                {"name": "@Schroeder", "tickets": 1},
                {"name": "@obsd_guru", "tickets": 1},
                {"name": "@gnupublic", "tickets": 1}
            ]
        },
        {
            "title": "Paket #5 NetApp",
            "participants": [
                {"name": "@Schroeder", "tickets": 1},
                {"name": "@obsd_guru", "tickets": 1}
            ]
        }
    ]
};

function formatDrawing(drawing) {
    const participants = drawing.participants
        .map(p => `${p.name} (${p.tickets})`)
        .join(', ');
    return `${drawing.text}: ${participants} → ${drawing.winner}`;
}

function formatResults(results) {
    const dt = new Date(results.timestamp);
    const epochTime = Math.floor(dt.getTime() / 1000);
    
    let output = `${results.title}\n`;
    output += `Zeitpunkt: ${results.timestamp} (${epochTime})\n`;
    output += `Seed: ${results.rngSeed}\n\n`;
    
    for (const drawing of results.drawings) {
        output += formatDrawing(drawing) + '\n';
    }
    
    return output;
}

async function runLottery() {
    try {
        const jsonInput = document.getElementById('jsonInput').value;
        const data = JSON.parse(jsonInput);
        
        const lottery = new Lottery(data);
        await lottery.initialize();
        const results = await lottery.draw();
        
        // Display formatted results
        document.getElementById('results').textContent = formatResults(results);
        
        // Save results to JSON
        const jsonStr = JSON.stringify(results, null, 4);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lottery-results.json';
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        document.getElementById('results').textContent = `Error: ${error.message}`;
    }
}

// Initialize the UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Set up the example data
    document.getElementById('jsonInput').value = JSON.stringify(exampleData, null, 4);
    
    // Set up the run button
    document.querySelector('button').onclick = () => runLottery();
}); 