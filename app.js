import { Lottery } from './lottery.js'

function shortenSeed(seed) {
  if (seed.length <= 16) return seed
  return `${seed.substring(0, 8)}...${seed.substring(seed.length - 8)}`
}

function getRandomWinEmoji() {
  const emojis = ['🚀', '🎉', '🏆', '🥳', '🎂', '🍾', '🎊', '⭐', '💎', '👏']
  return emojis[Math.floor(Math.random() * emojis.length)]
}

function getResultsHTML(results) {
  const dt = new Date(results.timestamp)
  const epochTime = Math.floor(dt.getTime() / 1000)
  const shortSeed = shortenSeed(results.rngSeed)

  return `
        <div class="results-content">
            <div class="results-header">
                <h2>${results.title}</h2>
                <div class="results-meta">
                    <p><strong>Zeitpunkt:</strong> ${results.timestamp} (${epochTime})</p>
                    <p>
                        <strong>Seed:</strong> 
                        <code class="copyable-seed" title="Klicken zum Kopieren des vollständigen Seeds" data-seed="${results.rngSeed}">
                            ${shortSeed}
                        </code>
                    </p>
                </div>
            </div>
            <div class="results-list">
                ${results.drawings
                  .map(
                    (drawing) => `
                    <div class="result-item">
                        <h3>${drawing.text}</h3>
                        <p class="participants-line">
                            <strong>Teilnehmer:</strong> 
                            ${drawing.participants.map((p) => `@${p.name}`).join(', ')}
                        </p>
                        <div class="winner-announcement">
                            Gewinner: <strong>@${drawing.winner} ${getRandomWinEmoji()}</strong>
                        </div>
                    </div>
                `,
                  )
                  .join('')}
            </div>
        </div>
    `
}

function createFilename(title) {
  // Convert to lowercase and replace spaces with hyphens
  let filename = title
    .toLowerCase()
    // Replace spaces and special characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 50 characters (accounting for the prefix)
    .substring(0, 42)

  // Add timestamp to ensure uniqueness
  const timestamp = new Date().toISOString().split('T')[0]
  return `verlosung-${filename}-${timestamp}`
}

function displayResults(results) {
  const filename = createFilename(results.title)
  const resultsHTML = getResultsHTML(results)

  const resultsContainer = document.getElementById('results')
  resultsContainer.innerHTML = `
        ${resultsHTML}
        <div class="results-actions">
            <button type="button" id="copyResults" class="action-button">Ergebnisse kopieren</button>
            <button type="button" id="downloadResults" class="action-button">JSON herunterladen</button>
        </div>
    `

  // Add event listener for seed copy
  const seedElement = resultsContainer.querySelector('.copyable-seed')
  if (seedElement) {
    seedElement.addEventListener('click', () => {
      const fullSeed = seedElement.dataset.seed
      navigator.clipboard
        .writeText(fullSeed)
        .then(() => {
          const originalText = seedElement.textContent
          seedElement.textContent = 'Kopiert!'
          seedElement.classList.add('copied')
          setTimeout(() => {
            seedElement.textContent = originalText
            seedElement.classList.remove('copied')
          }, 2000)
        })
        .catch((err) => {
          console.error('Failed to copy seed: ', err)
          alert('Fehler beim Kopieren des Seeds')
        })
    })
  }

  // Add event listener for copy button
  document.getElementById('copyResults').addEventListener('click', async () => {
    try {
      // Create a temporary container for the HTML content
      const tempContainer = document.createElement('div')
      tempContainer.innerHTML = resultsHTML

      // Create a Blob with the HTML content
      const blob = new Blob([tempContainer.innerHTML], { type: 'text/html' })

      // Create a ClipboardItem with the Blob
      const data = new ClipboardItem({
        'text/html': blob,
      })

      // Write both HTML and plain text to clipboard
      await navigator.clipboard.write([data])

      const button = document.getElementById('copyResults')
      const originalText = button.textContent
      button.textContent = 'Kopiert!'
      button.classList.add('copied')
      setTimeout(() => {
        button.textContent = originalText
        button.classList.remove('copied')
      }, 2000)
    } catch (err) {
      console.error('Failed to copy results: ', err)
      alert('Fehler beim Kopieren der Ergebnisse')
    }
  })

  // Add event listener for download button
  document.getElementById('downloadResults').addEventListener('click', () => {
    const jsonStr = JSON.stringify(results, null, 4)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.json`
    a.click()
    URL.revokeObjectURL(url)
  })
}

// Function to update page title and header
function updatePageTitle(title) {
  // Update document title
  document.title = title || 'Verlosung Spende'

  // Update h1 header and ensure delete button exists
  const header = document.querySelector('body > div > h1')
  if (header) {
    // Create or update header container
    let headerContainer = header.parentElement
    if (!headerContainer.classList.contains('header-container')) {
      headerContainer = document.createElement('div')
      headerContainer.className = 'header-container'
      header.parentNode.insertBefore(headerContainer, header)
      headerContainer.appendChild(header)
    }

    // Create or update delete button
    let deleteButton = headerContainer.querySelector('.clear-lottery')
    if (!deleteButton) {
      deleteButton = document.createElement('button')
      deleteButton.type = 'button'
      deleteButton.className = 'clear-lottery'
      deleteButton.title = 'Verlosung zurücksetzen'
      deleteButton.textContent = '×'
      deleteButton.addEventListener('click', () => {
        if (confirm('Willst Du eine neue Verlosung eingeben?')) {
          // Clear localStorage
          localStorage.removeItem('lotteryData')
          // Reload the page to start fresh
          window.location.reload()
        }
      })
      headerContainer.appendChild(deleteButton)
    }

    // Update header text
    header.textContent = title || 'Verlosung Spende'
  }
}

// Function to construct lottery data object
function makeLotteryData() {
  const lotteryNumber = document.getElementById('lotteryNumber').value.trim()
  const lotteryName = document.getElementById('lotteryName').value.trim()
  const title = `Verlosung Spende ${lotteryNumber}: ${lotteryName}`

  // Update page title
  updatePageTitle(title)

  const timestampInput = document.getElementById('timestamp').value
  let timestamp = null
  if (timestampInput) {
    try {
      const date = new Date(timestampInput)
      if (!isNaN(date.getTime())) {
        timestamp = date.toISOString()
      }
    } catch (e) {
      console.warn('Invalid timestamp:', e)
    }
  }

  const pakets = Array.from(document.querySelectorAll('.paket')).map((paket) => {
    const participants = Array.from(paket.querySelectorAll('.participant-name'))
      .map((input) => ({
        name: input.value.trim(),
        tickets: 1,
      }))
      .filter((p) => p.name)
    const paketTitle = paket.querySelector('.paket-title').value.trim()

    return {
      title: paketTitle,
      participants,
    }
  })

  const data = {
    title,
    packets: pakets,
  }

  // Only add timestamp if it's valid
  if (timestamp) {
    data.timestamp = timestamp
  }

  return data
}

// Function to save lottery data to localStorage
function saveLotteryData() {
  const data = makeLotteryData()
  localStorage.setItem('lotteryData', JSON.stringify(data))
}

// Function to load lottery data from localStorage
function loadLotteryData() {
  const savedData = localStorage.getItem('lotteryData')
  if (!savedData) return null

  try {
    return JSON.parse(savedData)
  } catch (e) {
    console.error('Error loading saved lottery data:', e)
    return null
  }
}

// Function to populate form with saved data
function populateFormWithData(data) {
  if (!data) return

  // Update page title with saved title
  updatePageTitle(data.title)

  // Extract lottery number and name from title
  // Title format: "Verlosung Spende {number}: {name}"
  const titleMatch = data.title.match(/^Verlosung Spende\s+(\d+):\s+(.+)$/)
  if (titleMatch) {
    const [, number, name] = titleMatch
    document.getElementById('lotteryNumber').value = number
    document.getElementById('lotteryName').value = name
  } else {
    // If title doesn't match expected format, try to extract what we can
    const numberMatch = data.title.match(/\d+/)
    if (numberMatch) {
      document.getElementById('lotteryNumber').value = numberMatch[0]
    }
    // Try to get the name part after any number
    const nameMatch = data.title.replace(/^Verlosung Spende\s*\d*:?\s*/, '')
    if (nameMatch) {
      document.getElementById('lotteryName').value = nameMatch
    }
  }

  // Set timestamp
  if (data.timestamp) {
    const date = new Date(data.timestamp)
    // Convert to local timezone for datetime-local input
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    document.getElementById('timestamp').value = `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Clear existing pakets
  const paketsContainer = document.getElementById('pakets-container')
  paketsContainer.innerHTML = ''

  // Add saved pakets
  data.packets.forEach((paket) => {
    const newPaket = createPaket()
    const paketTitleInput = newPaket.querySelector('.paket-title')
    paketTitleInput.value = paket.title

    // Remove default participant input
    const participantsContainer = newPaket.querySelector('.participants-container')
    participantsContainer.innerHTML = ''

    // Add saved participants
    paket.participants.forEach((participant) => {
      const participantInput = createParticipantInput()
      participantInput.querySelector('input').value = participant.name
      participantsContainer.appendChild(participantInput)
    })

    // Add the "add participant" button back
    const addButton = document.createElement('button')
    addButton.type = 'button'
    addButton.className = 'add-participant'
    addButton.textContent = '+ Neuer Teilnehmer'
    participantsContainer.appendChild(addButton)

    paketsContainer.appendChild(newPaket)
  })

  // Update UI state
  updateRemoveButtons()
  updateDrawButton()
}

// Update remove buttons visibility
function updateRemoveButtons() {
  // Update participant remove buttons
  document.querySelectorAll('.participants-container').forEach((container) => {
    const inputs = container.querySelectorAll('.participant-input')
    inputs.forEach((input, index) => {
      const removeButton = input.querySelector('.remove-participant')
      removeButton.style.display = inputs.length > 1 ? 'flex' : 'none'
    })
  })

  // Update paket remove buttons
  const pakets = document.querySelectorAll('.paket')
  pakets.forEach((paket) => {
    const removeButton = paket.querySelector('.remove-paket')
    removeButton.style.display = pakets.length > 1 ? 'flex' : 'none'
  })
}

// Update draw button state
function updateDrawButton() {
  const drawButton = document.getElementById('drawButton')
  if (!drawButton) return // Exit if button doesn't exist yet

  const lotteryNumber = document.getElementById('lotteryNumber').value.trim()
  const lotteryName = document.getElementById('lotteryName').value.trim()
  const timestamp = document.getElementById('timestamp').value
  const pakets = document.querySelectorAll('.paket')

  // Check if we have at least one paket
  if (pakets.length === 0) {
    drawButton.disabled = true
    return
  }

  // Check if all pakets have at least one participant
  const allPaketsHaveParticipants = Array.from(pakets).every((paket) => {
    const participants = paket.querySelectorAll('.participant-name')
    return Array.from(participants).some((input) => input.value.trim())
  })

  // Enable button only if all conditions are met
  drawButton.disabled = !(lotteryNumber && lotteryName && timestamp && allPaketsHaveParticipants)
}

// Create a new participant input
function createParticipantInput() {
  const div = document.createElement('div')
  div.className = 'participant-input'
  div.innerHTML = `
        <input type="text" placeholder="Teilnehmer Name" class="participant-name">
        <button type="button" class="remove-participant">×</button>
    `
  return div
}

// Create a new paket
function createPaket() {
  const paket = document.createElement('div')
  paket.className = 'paket'
  paket.dataset.paketId = 1 // This will be updated by renumberPakets
  paket.innerHTML = `
        <div class="paket-header">
            <h3>Paket #1</h3>
            <input type="text" class="paket-title" placeholder="Titel des Pakets" required>
            <button type="button" class="remove-paket">×</button>
        </div>
        <div class="participants-container">
            ${createParticipantInput().outerHTML}
            <button type="button" class="add-participant">+ Neuer Teilnehmer</button>
        </div>
    `
  return paket
}

// Initialize the UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('lotteryForm')
  const paketsContainer = document.getElementById('pakets-container')
  const addPaketButton = document.getElementById('addPaket')
  const drawButton = document.getElementById('drawButton')
  let paketCounter = 1

  // Add drag and drop handlers for JSON files
  document.addEventListener('dragover', (e) => {
    e.preventDefault()
    e.stopPropagation()
    document.body.classList.add('drag-over')
  })

  document.addEventListener('dragleave', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.target === document.body) {
      document.body.classList.remove('drag-over')
    }
  })

  document.addEventListener('drop', (e) => {
    e.preventDefault()
    e.stopPropagation()
    document.body.classList.remove('drag-over')

    const file = e.dataTransfer.files[0]
    if (!file || !file.name.endsWith('.json')) {
      alert('Bitte nur JSON-Dateien ablegen.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        console.log('Loaded JSON data:', data)

        // More detailed validation
        const validationErrors = []
        if (!data.title) {
          validationErrors.push('Titel fehlt')
        }

        // First validate the base lottery data structure
        if (!Array.isArray(data.packets)) {
          validationErrors.push('Keine Pakete gefunden')
        } else {
          // Validate packets structure
          data.packets.forEach((packet, index) => {
            if (!packet.title) {
              validationErrors.push(`Paket #${index + 1}: Titel fehlt`)
            }
            if (!Array.isArray(packet.participants)) {
              validationErrors.push(`Paket #${index + 1}: Keine Teilnehmer gefunden`)
            } else {
              packet.participants.forEach((participant, pIndex) => {
                if (!participant.name) {
                  validationErrors.push(`Paket #${index + 1}, Teilnehmer #${pIndex + 1}: Name fehlt`)
                }
              })
            }
          })
        }

        // If this is a results file, validate the additional results data
        if (data.drawings) {
          if (!Array.isArray(data.drawings)) {
            validationErrors.push('Ziehungen müssen ein Array sein')
          } else {
            // Validate each drawing
            data.drawings.forEach((drawing, index) => {
              if (!drawing.text) {
                validationErrors.push(`Ziehung #${index + 1}: Text fehlt`)
              }
              if (!Array.isArray(drawing.participants)) {
                validationErrors.push(`Ziehung #${index + 1}: Keine Teilnehmer gefunden`)
              } else {
                drawing.participants.forEach((participant, pIndex) => {
                  if (!participant.name) {
                    validationErrors.push(`Ziehung #${index + 1}, Teilnehmer #${pIndex + 1}: Name fehlt`)
                  }
                })
              }
              if (!drawing.winner) {
                validationErrors.push(`Ziehung #${index + 1}: Kein Gewinner gefunden`)
              }
            })
          }

          if (validationErrors.length > 0) {
            throw new Error(`Ungültiges Ergebnisformat:\n${validationErrors.join('\n')}`)
          }

          // For results files, first populate the form with the original lottery data
          const lotteryData = {
            title: data.title,
            timestamp: data.timestamp,
            packets: data.packets
          }
          populateFormWithData(lotteryData)
          localStorage.setItem('lotteryData', JSON.stringify(lotteryData))
          renumberPakets()
          updateRemoveButtons()
          updateDrawButton()

          // Then display the results
          displayResults(data)
        } else {
          // For lottery data files, validate and load into form
          if (validationErrors.length > 0) {
            throw new Error(`Ungültiges Dateiformat:\n${validationErrors.join('\n')}`)
          }
          populateFormWithData(data)
          localStorage.setItem('lotteryData', JSON.stringify(data))
          renumberPakets()
          updateRemoveButtons()
          updateDrawButton()
        }
      } catch (error) {
        console.error('Error loading JSON:', error)
        if (error instanceof SyntaxError) {
          alert('Die Datei enthält kein gültiges JSON-Format')
        } else {
          alert(error.message)
        }
      }
    }
    reader.onerror = () => {
      alert('Fehler beim Lesen der Datei')
    }
    reader.readAsText(file)
  })

  // Format date to German format
  function formatDate(date) {
    const months = [
      'Jan',
      'Feb',
      'Mär',
      'Apr',
      'Mai',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Okt',
      'Nov',
      'Dez',
    ]
    const day = String(date.getDate()).padStart(2, '0')
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day} ${month} ${year} ${hours}:${minutes}`
  }

  // Add new participant input
  function addNewParticipant(participantsContainer) {
    // Remove the add button temporarily
    const addButton = participantsContainer.querySelector('.add-participant')
    addButton.remove()

    // Add the new participant input
    const newInput = createParticipantInput()
    participantsContainer.appendChild(newInput)
    newInput.querySelector('input').focus()

    // Add the button back at the bottom
    participantsContainer.appendChild(addButton)

    updateRemoveButtons()
    updateDrawButton()
  }

  // Remove participant input
  function removeParticipant(event) {
    const participantInput = event.target.closest('.participant-input')
    const participantsContainer = participantInput.closest('.participants-container')
    if (participantsContainer.children.length > 1) {
      participantInput.remove()
      updateRemoveButtons()
      updateDrawButton()
    }
  }

  // Renumber all pakets
  function renumberPakets() {
    const pakets = document.querySelectorAll('.paket')
    pakets.forEach((paket, index) => {
      const newNumber = index + 1
      paket.dataset.paketId = newNumber
      paket.querySelector('h3').textContent = `Paket #${newNumber}`
    })
    paketCounter = pakets.length
  }

  // Remove paket
  function removePaket(event) {
    const paket = event.target.closest('.paket')
    const paketsContainer = paket.closest('#pakets-container')
    if (paketsContainer.children.length > 1) {
      paket.remove()
      renumberPakets()
      updateRemoveButtons()
      updateDrawButton()
    }
  }

  // Add event listeners for title changes
  document.getElementById('lotteryNumber').addEventListener('input', () => {
    const lotteryNumber = document.getElementById('lotteryNumber').value.trim()
    const lotteryName = document.getElementById('lotteryName').value.trim()
    if (lotteryNumber && lotteryName) {
      updatePageTitle(`Verlosung Spende ${lotteryNumber}: ${lotteryName}`)
    } else {
      updatePageTitle('Verlosung Spende')
    }
    updateDrawButton()
  })

  document.getElementById('lotteryName').addEventListener('input', () => {
    const lotteryNumber = document.getElementById('lotteryNumber').value.trim()
    const lotteryName = document.getElementById('lotteryName').value.trim()
    if (lotteryNumber && lotteryName) {
      updatePageTitle(`Verlosung Spende ${lotteryNumber}: ${lotteryName}`)
    } else {
      updatePageTitle('Verlosung Spende')
    }
    updateDrawButton()
  })

  // Add timestamp event listener
  document.getElementById('timestamp').addEventListener('change', updateDrawButton)

  // Handle participant input events
  paketsContainer.addEventListener('input', (event) => {
    if (
      event.target.classList.contains('participant-name') ||
      event.target.classList.contains('paket-title')
    ) {
      updateDrawButton()
    }
  })

  // Add new participant input when Enter is pressed
  function handleParticipantInput(event) {
    if (event.key === 'Enter' && event.target.value.trim()) {
      event.preventDefault()
      const participantsContainer = event.target.closest('.participants-container')
      addNewParticipant(participantsContainer)
    }
  }

  // Handle participant input events
  paketsContainer.addEventListener('keydown', (event) => {
    if (event.target.classList.contains('participant-name')) {
      handleParticipantInput(event)
    }
  })

  // Handle paket container clicks
  paketsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-paket')) {
      removePaket(event)
    } else if (event.target.classList.contains('remove-participant')) {
      removeParticipant(event)
    } else if (event.target.classList.contains('add-participant')) {
      const participantsContainer = event.target.closest('.participants-container')
      addNewParticipant(participantsContainer)
    }
  })

  // Add new paket
  addPaketButton.addEventListener('click', () => {
    const newPaket = createPaket()
    newPaket.dataset.paketId = paketCounter
    newPaket.querySelector('h3').textContent = `Paket #${paketCounter}`
    paketsContainer.appendChild(newPaket)
    newPaket.querySelector('input').focus()
    updateRemoveButtons()
    updateDrawButton()
  })

  // Add event listeners for saving data
  const saveEvents = ['input', 'change']
  const formElements = [
    document.getElementById('lotteryNumber'),
    document.getElementById('lotteryName'),
    document.getElementById('timestamp'),
    paketsContainer,
  ]

  formElements.forEach((element) => {
    saveEvents.forEach((eventType) => {
      element.addEventListener(eventType, () => {
        saveLotteryData()
        updateDrawButton()
      })
    })
  })

  // Load saved data when page opens
  const savedData = loadLotteryData()
  if (savedData) {
    populateFormWithData(savedData)
    // After populating, update the paket numbers
    renumberPakets()
  }

  // Modify draw button click handler to use makeLotteryData
  drawButton.addEventListener('click', async () => {
    try {
      const lotteryData = makeLotteryData()

      // Validate data before proceeding
      if (!lotteryData.packets.every((p) => p.title)) {
        throw new Error('Bitte geben Sie für jedes Paket einen Titel ein.')
      }

      // Create and run lottery
      const lottery = new Lottery(lotteryData)
      await lottery.initialize()
      const results = await lottery.draw()

      // Display results in HTML format
      displayResults(results)
    } catch (error) {
      document.getElementById('results').innerHTML = `
                <div class="error-message">
                    <h3>Fehler</h3>
                    <p>${error.message}</p>
                </div>
            `
    }
  })

  // Initialize remove buttons visibility
  updateRemoveButtons()
  // Initialize button state
  updateDrawButton()
})
