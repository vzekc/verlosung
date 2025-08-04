import { Lottery } from './lottery.js'

// Global counter for pakets
let paketCounter = 1

// Add a flag to track if we're currently initializing/populating the form
let isInitializing = false

// Function to parse participant input
function parseParticipantsInput(input) {
  console.log('parseParticipantsInput called with:', input)
  const lines = input.split('\n').filter(line => line.trim())
  console.log('Filtered lines:', lines)
  const participants = []
  const errors = []

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim()
    if (!trimmedLine) return

    // Split by spaces, commas, or semicolons
    const parts = trimmedLine.split(/[\s,;]+/).filter(part => part.trim())
    console.log(`Line ${lineIndex + 1} parts:`, parts)

    if (parts.length < 2) {
      errors.push(`Zeile ${lineIndex + 1}: Ungültiges Format. Erwartet: <nickname> <paket1> [<paket2> ...]`)
      return
    }

    const nickname = parts[0].trim()
    const packetNumbers = parts.slice(1).map(part => part.trim()).filter(part => part)

    // Validate nickname
    if (!nickname.match(/^[a-zA-Z0-9_-]+$/)) {
      errors.push(`Zeile ${lineIndex + 1}: Ungültiger Nickname "${nickname}". Nur Buchstaben, Zahlen, Unterstriche und Bindestriche erlaubt.`)
      return
    }

    // Validate packet numbers
    const validPacketNumbers = []
    for (const packetNum of packetNumbers) {
      const num = parseInt(packetNum)
      if (isNaN(num) || num < 1) {
        errors.push(`Zeile ${lineIndex + 1}: Ungültige Paketnummer "${packetNum}". Muss eine positive Zahl sein.`)
        return
      }
      validPacketNumbers.push(num)
    }

    // Check for duplicate nicknames
    if (participants.some(p => p.name === nickname)) {
      errors.push(`Zeile ${lineIndex + 1}: Nickname "${nickname}" ist bereits vorhanden.`)
      return
    }

    participants.push({
      name: nickname,
      packets: validPacketNumbers
    })
  })

  console.log('parseParticipantsInput result:', { participants, errors })
  return { participants, errors }
}

// Function to validate packet numbers against existing packets
function validatePacketNumbers(participants, packetCount) {
  console.log('validatePacketNumbers called with:', { participants, packetCount })
  const errors = []

  participants.forEach((participant, participantIndex) => {
    participant.packets.forEach(packetNum => {
      if (packetNum > packetCount) {
        errors.push(`${participant.name}: Paket ${packetNum} existiert nicht (maximal ${packetCount} Pakete verfügbar).`)
      }
    })
  })

  console.log('validatePacketNumbers result:', errors)
  return errors
}

// Function to generate participants overview HTML
function generateParticipantsOverview(participants, packets, validationErrors) {
  if (participants.length === 0) {
    return '<p>Keine Teilnehmer eingegeben.</p>'
  }

  const overviewHTML = participants.map(participant => {
    const packetTitles = participant.packets.map(packetNum => {
      const packet = packets[packetNum - 1]
      return packet ? packet.title : `Paket ${packetNum}`
    }).join(', ')

    const hasError = validationErrors.some(error => error.includes(participant.name))
    const errorClass = hasError ? 'error' : ''

    return `
      <div class="participant-entry ${errorClass}">
        <span class="participant-name">@${participant.name}</span>
        <span class="participant-packets">→ ${packetTitles}</span>
      </div>
    `
  }).join('')

  return overviewHTML
}

// Function to convert participants data to the format expected by the lottery
function convertParticipantsToLotteryFormat(participants, packets) {
  const packetParticipants = packets.map(() => [])

  participants.forEach(participant => {
    participant.packets.forEach(packetNum => {
      if (packetNum <= packets.length) {
        packetParticipants[packetNum - 1].push(participant.name)
      }
    })
  })

  return packets.map((packet, index) => ({
    title: packet.title,
    participants: packetParticipants[index].map(name => ({ name, tickets: 1 }))
  }))
}

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
                    (drawing, index) => `
                    <section class="result-item">
                        <h3>Paket #${index + 1}: ${drawing.text}</h3>
                        <div class="participants-label"><strong>Teilnehmer:</strong></div>
                        <ul class="participants-list">
                            ${drawing.participants.map((p) => `<li class="participant">@${p.name}</li>`).join('')}
                        </ul>
                        <div class="winner-announcement"><strong>Gewinner:</strong> @${drawing.winner} ${getRandomWinEmoji()}</div>
                    </section>
                `,
                  )
                  .join('')}
            </div>
        </div>
    `
}

function createFilename(title) {
  // Remove "Verlosung Spende" prefix if it exists
  let filename = title
    .replace(/^Verlosung Spende\s*\d*:?\s*/, '')
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

// Function to reset lottery data to edit mode
function resetToEditMode() {
  console.log('resetToEditMode: Starting...')

  // Load current data from localStorage
  const savedData = loadLotteryData()
  if (!savedData) {
    console.error('resetToEditMode: No data found in localStorage')
    return
  }

  // Create a copy of the data without the drawings
  const editData = {
    title: savedData.title,
    packets: savedData.packets,
    timestamp: savedData.timestamp,
  }

  // Save the modified data back to localStorage
  console.log('resetToEditMode: Saving modified data to localStorage')
  localStorage.setItem('lotteryData', JSON.stringify(editData))

  // Reinitialize the app with the modified data
  console.log('resetToEditMode: Reinitializing app')
  initializeApp(editData)
}

// Function to display results
function displayResults(results) {
  const filename = createFilename(results.title)
  const resultsHTML = getResultsHTML(results)

  const resultsContainer = document.getElementById('results')
  resultsContainer.innerHTML = `
        ${resultsHTML}
        <div class="results-actions">
            <button type="button" id="copyResults" class="action-button">Ergebnisse kopieren</button>
            <button type="button" id="downloadResults" class="action-button">JSON herunterladen</button>
            <button type="button" id="editParticipants" class="action-button edit-button">Teilnehmer ändern</button>
        </div>
    `

  // Show the results container
  resultsContainer.style.display = 'block'

  // Hide the form
  const form = document.getElementById('lotteryForm')
  if (form && form.style) {
    form.style.display = 'none'
  }

  // Add event listener for edit participants button
  const editButton = document.getElementById('editParticipants')
  if (editButton) {
    editButton.addEventListener('click', () => {
      if (
        confirm(
          'Möchtest Du die Teilnehmer ändern? Die aktuellen Ergebnisse werden dabei gelöscht.',
        )
      ) {
        resetToEditMode()
      }
    })
  }

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

  // Get packet titles
  const packets = Array.from(document.querySelectorAll('.paket')).map((paket) => {
    const paketTitle = paket.querySelector('.paketTitle').value.trim()
    return {
      title: paketTitle,
    }
  })

  // Parse participants input
  const participantsInput = document.getElementById('participantsInput').value.trim()
  const { participants, errors: parseErrors } = parseParticipantsInput(participantsInput)

  // Validate packet numbers
  const packetValidationErrors = validatePacketNumbers(participants, packets.length)
  const allErrors = [...parseErrors, ...packetValidationErrors]

  // Convert to lottery format
  const lotteryPackets = convertParticipantsToLotteryFormat(participants, packets)

  const data = {
    title,
    packets: lotteryPackets,
  }

  // Only add timestamp if it's valid
  if (timestamp) {
    data.timestamp = timestamp
  }

  return { data, errors: allErrors }
}

// Function to save lottery data to localStorage
function saveLotteryData() {
  const { data } = makeLotteryData()
  localStorage.setItem('lotteryData', JSON.stringify(data))
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

// Function to initialize the application with lottery data
function initializeApp(data) {
  console.log('initializeApp: Starting with data:', data)
  if (!data) {
    console.log('initializeApp: No data provided')
    return
  }

  try {
    // Validate the data structure
    console.log('initializeApp: Validating data structure')
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
                validationErrors.push(
                  `Ziehung #${index + 1}, Teilnehmer #${pIndex + 1}: Name fehlt`,
                )
              }
            })
          }
          if (!drawing.winner) {
            validationErrors.push(`Ziehung #${index + 1}: Kein Gewinner gefunden`)
          }
        })
      }
    }

    if (validationErrors.length > 0) {
      throw new Error(`Ungültiges Dateiformat:\n${validationErrors.join('\n')}`)
    }

    // Save to localStorage
    console.log('initializeApp: Saving to localStorage')
    localStorage.setItem('lotteryData', JSON.stringify(data))

    // Clear existing form
    const paketsContainer = document.getElementById('pakets-container')
    console.log('initializeApp: Pakets container exists:', !!paketsContainer)
    if (paketsContainer) {
      console.log('initializeApp: Clearing pakets container')
      paketsContainer.innerHTML = ''
    }

    // Check if this is a results file
    const isResultsFile = Array.isArray(data.drawings)
    console.log('initializeApp: Is results file:', isResultsFile)

    // Populate the form
    console.log('initializeApp: Populating form')
    populateFormWithData(data)

    // If this is a results file, display the results
    if (isResultsFile) {
      console.log('initializeApp: Displaying results')
      displayResults(data)
    }

    // Update UI state - only update buttons if not in read-only mode
    console.log('initializeApp: Updating UI state')
    renumberPakets()
    if (!isResultsFile) {
      console.log('initializeApp: Updating remove buttons (not in read-only mode)')
      updateRemoveButtons()
    }
    updateDrawButton()

    console.log('initializeApp: Completed successfully')
  } catch (error) {
    console.error('initializeApp: Error during initialization:', error)
    throw error
  }
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

// Function to make the form read-only
function makeFormReadOnly() {
  console.log('makeFormReadOnly: Starting...')

  // Hide the entire form
  const form = document.getElementById('lotteryForm')
  console.log('makeFormReadOnly: Form exists:', !!form)
  if (form && form.style) {
    console.log('makeFormReadOnly: Hiding form')
    form.style.display = 'none'
  }

  // Show the results container
  const resultsContainer = document.getElementById('results')
  console.log('makeFormReadOnly: Results container exists:', !!resultsContainer)
  if (resultsContainer && resultsContainer.style) {
    console.log('makeFormReadOnly: Showing results container')
    resultsContainer.style.display = 'block'
  }

  console.log('makeFormReadOnly: Completed')
}

// Function to make the form editable
function makeFormEditable() {
  console.log('makeFormEditable: Starting...')

  // Show the form
  const form = document.getElementById('lotteryForm')
  console.log('makeFormEditable: Form exists:', !!form)
  if (form && form.style) {
    console.log('makeFormEditable: Showing form')
    form.style.display = 'block'
  }

  // Hide the results container
  const resultsContainer = document.getElementById('results')
  console.log('makeFormEditable: Results container exists:', !!resultsContainer)
  if (resultsContainer && resultsContainer.style) {
    console.log('makeFormEditable: Hiding results container')
    resultsContainer.style.display = 'none'
  }

  console.log('makeFormEditable: Completed')
}

// Add a function to clear all validation messages
function clearAllValidationMessages() {
  console.log('[clearAllValidationMessages] Clearing all validation messages')
  document.querySelectorAll('.validation-message').forEach((element) => {
    element.style.display = 'none'
    element.classList.remove('show')
    element.textContent = ''
  })
}

function populateFormWithData(data) {
  console.log('[populateFormWithData] Starting with data:', {
    title: data.title,
    hasDrawings: Array.isArray(data.drawings),
    lotteryNumber: data.title.match(/^Verlosung Spende\s+(\d+):\s+(.+)$/)?.[1],
  })

  isInitializing = true // Set flag before populating form
  clearAllValidationMessages() // Clear any existing validation messages

  try {
    // Check if this is a results file (has drawings)
    const isResultsFile = Array.isArray(data.drawings)
    console.log('populateFormWithData: Is results file:', isResultsFile)

    // Update page title with saved title
    console.log('populateFormWithData: Updating page title')
    updatePageTitle(data.title)

    if (isResultsFile) {
      // For results files, just display the results
      console.log('populateFormWithData: Displaying results')
      displayResults(data)
      makeFormReadOnly()
    } else {
      // For normal lottery data, populate the form
      console.log('populateFormWithData: Populating form')
      makeFormEditable()

      // Extract lottery number and name from title
      const titleMatch = data.title.match(/^Verlosung Spende\s+(\d+):\s+(.+)$/)
      if (titleMatch) {
        const [, number, name] = titleMatch
        console.log('[populateFormWithData] Setting lottery number:', {
          number,
          name,
          elementExists: !!document.getElementById('lotteryNumber'),
        })
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
      console.log('populateFormWithData: Pakets container exists:', !!paketsContainer)
      paketsContainer.innerHTML = ''

      // Add saved pakets
      data.packets.forEach((paket) => {
        const newPaket = createPaket()
        const paketTitleInput = newPaket.querySelector('.paketTitle')
        paketTitleInput.value = paket.title
        paketsContainer.appendChild(newPaket)
      })

      // Convert participants data to textarea format
      const participantsInput = document.getElementById('participantsInput')
      if (participantsInput && data.packets) {
        const participantLines = []

        // Create a map of participant names to their packet numbers
        const participantMap = new Map()

        data.packets.forEach((packet, packetIndex) => {
          packet.participants.forEach(participant => {
            if (!participantMap.has(participant.name)) {
              participantMap.set(participant.name, [])
            }
            participantMap.get(participant.name).push(packetIndex + 1)
          })
        })

        // Convert to textarea format
        participantMap.forEach((packets, name) => {
          participantLines.push(`${name} ${packets.join(' ')}`)
        })

        participantsInput.value = participantLines.join('\n')
      }

      // Update UI state for normal lottery data
      console.log('populateFormWithData: Updating UI state')
      updateRemoveButtons()
      updateDrawButton()
    }
  } finally {
    isInitializing = false // Reset flag after populating form
    // Only update button state after initialization is complete
    updateDrawButton()
  }

  console.log('populateFormWithData: Completed')
}

// Update remove buttons visibility
function updateRemoveButtons() {
  // Update paket remove buttons
  const pakets = document.querySelectorAll('.paket')
  pakets.forEach((paket) => {
    const removeButton = paket.querySelector('.remove-paket')
    removeButton.style.display = pakets.length > 1 ? 'flex' : 'none'
  })
}

// Update draw button state
function updateDrawButton() {
  // Skip button updates during initialization
  if (isInitializing) {
    console.log('[updateDrawButton] Skipping during initialization')
    return
  }

  const drawButton = document.getElementById('drawButton')
  if (!drawButton) return

  // Get all required inputs
  const form = document.getElementById('lotteryForm')
  const inputs = form.querySelectorAll('input[required], textarea[required]')
  let isValid = true

  // Local function to set invalid and log reason
  function setInvalid(reason) {
    isValid = false
    console.log('Setting invalid:', reason)
  }

  // Debug: print values of all required inputs
  inputs.forEach((input) => {
    console.log(
      `Field ${input.id || input.className}: value='${input.value}', type='${input.type}'`,
    )
  })

  // Validate all required inputs
  inputs.forEach((input) => {
    const errorElement = document.getElementById(`${input.id}Error`) ||
      input.closest('.paket')?.querySelector('.paketTitle-error')

    // Pass false for showError to prevent showing errors during button state updates
    const valid = validateInput(input, errorElement, false)
    console.log(`Validating ${input.id || input.className}:`, valid)
    if (!valid) {
      setInvalid(`Required input validation failed for ${input.id || input.className}`)
    }
  })

  // Validate all paket titles
  document.querySelectorAll('.paketTitle').forEach((input) => {
    const errorElement = input.closest('.paket').querySelector('.paketTitle-error')
    // Pass false for showError to prevent showing errors during button state updates
    const valid = validateInput(input, errorElement, false)
    console.log(`Validating paket title:`, valid)
    if (!valid) {
      setInvalid(`Paket title validation failed`)
    }
  })

  // Check if we have at least one paket
  const pakets = document.querySelectorAll('.paket')
  console.log('Number of pakets:', pakets.length)
  if (pakets.length === 0) {
    setInvalid('No pakets found')
  }

  // Validate participants input
  const participantsInput = document.getElementById('participantsInput')
  console.log('Validating participants input:', {
    exists: !!participantsInput,
    value: participantsInput?.value,
    trimmed: participantsInput?.value?.trim()
  })

  if (participantsInput && participantsInput.value.trim()) {
    const { participants, errors: parseErrors } = parseParticipantsInput(participantsInput.value)
    const pakets = document.querySelectorAll('.paket')
    const packetValidationErrors = validatePacketNumbers(participants, pakets.length)
    const allErrors = [...parseErrors, ...packetValidationErrors]

    console.log('Participants validation:', {
      participants: participants.length,
      parseErrors: parseErrors.length,
      packetValidationErrors: packetValidationErrors.length,
      allErrors: allErrors.length
    })

    if (allErrors.length > 0) {
      setInvalid('Participants validation failed due to errors')
    }

    // Check if we have at least one participant
    if (participants.length === 0) {
      setInvalid('No participants found')
    }
  } else {
    // No participants entered
    setInvalid('No participants input')
  }

  // Update button state
  drawButton.disabled = !isValid
  console.log('Draw button disabled:', drawButton.disabled, 'isValid:', isValid)
}

// Function to update participants overview
function updateParticipantsOverview() {
  const participantsInput = document.getElementById('participantsInput')
  const overviewContainer = document.getElementById('participantsOverview')
  const overviewContent = document.getElementById('overviewContent')

  if (!participantsInput || !overviewContainer || !overviewContent) return

  const input = participantsInput.value.trim()
  if (!input) {
    overviewContainer.style.display = 'none'
    return
  }

  const { participants, errors: parseErrors } = parseParticipantsInput(input)
  const pakets = Array.from(document.querySelectorAll('.paket')).map(paket => ({
    title: paket.querySelector('.paketTitle').value.trim()
  }))

  const packetValidationErrors = validatePacketNumbers(participants, pakets.length)
  const allErrors = [...parseErrors, ...packetValidationErrors]

  const overviewHTML = generateParticipantsOverview(participants, pakets, allErrors)
  overviewContent.innerHTML = overviewHTML

  // Show overview if we have participants
  if (participants.length > 0) {
    overviewContainer.style.display = 'block'
  } else {
    overviewContainer.style.display = 'none'
  }

  // Update error display for participants input
  const errorElement = document.getElementById('participantsInputError')
  if (errorElement) {
    if (allErrors.length > 0) {
      errorElement.textContent = allErrors.join('\n')
      errorElement.style.display = 'block'
      errorElement.classList.add('show')
    } else {
      errorElement.style.display = 'none'
      errorElement.classList.remove('show')
      errorElement.textContent = ''
    }
  }
}



// Create a new paket
function createPaket() {
  const paket = document.createElement('div')
  paket.className = 'paket'
  paket.dataset.paketId = paketCounter
  paket.innerHTML = `
        <div class="paket-header">
            <h3>Paket #${paketCounter}</h3>
            <div class="input-wrapper">
                <input type="text" class="paketTitle" placeholder="Titel des Pakets" required minlength="3" maxlength="100">
                <div class="validation-message paketTitle-error"></div>
            </div>
            <button type="button" class="remove-paket">×</button>
        </div>
    `
  paketCounter++
  return paket
}

// Validation messages in German
const validationMessages = {
  lotteryNumber: {
    required: 'Bitte gib die Nummer der Spende ein.',
    range: 'Die Nummer muss zwischen 100 und 9999 liegen.',
    pattern: 'Bitte nur Ziffern eingeben.',
  },
  lotteryName: {
    required: 'Bitte gib den Namen der Spende ein.',
    minLength: 'Der Name muss mindestens 3 Zeichen lang sein.',
    maxLength: 'Der Name darf maximal 100 Zeichen lang sein.',
  },
  timestamp: {
    required: 'Bitte gib das Datum und die Uhrzeit der Verlosungsankündigung ein.',
    min: 'Das Datum muss nach dem 01.01.2020 liegen.',
    invalid: 'Bitte gib ein gültiges Datum und eine gültige Uhrzeit ein.',
  },
  paketTitle: {
    required: 'Bitte gib einen Titel für das Paket ein.',
    minLength: 'Der Titel muss mindestens 3 Zeichen lang sein.',
    maxLength: 'Der Titel darf maximal 100 Zeichen lang sein.',
  },
  participantsInput: {
    required: 'Bitte gib die Teilnehmer ein.',
  },
}

// Function to validate a single input field
function validateInput(input, errorElement, showError = true) {
  // Skip validation during initialization unless explicitly requested
  if (isInitializing && !showError) {
    console.log(
      `[validateInput] Skipping validation during initialization for ${input.id || input.className}`,
    )
    // Clear error message during initialization
    if (errorElement) {
      errorElement.style.display = 'none'
      errorElement.classList.remove('show')
      errorElement.textContent = ''
    }
    return true
  }

  console.log(`[validateInput] Starting validation for ${input.id || input.className}:`, {
    value: input.value,
    showError,
    isRequired: input.required,
    hasFocus: document.activeElement === input,
    type: input.type,
    isInitializing,
  })

  const value = input.value.trim()
  let isValid = true
  let errorMessage = ''
  let validationKey = input.id
  if (!validationKey) {
    if (input.classList.contains('paketTitle')) validationKey = 'paketTitle'
  }

  // Check required
  if (input.required && !value) {
    console.log(`[validateInput] Required field validation failed for ${validationKey}:`, {
      value,
      hasFocus: document.activeElement === input,
      showError,
    })
    isValid = false
    errorMessage = validationMessages[validationKey]?.required || 'Dieses Feld ist erforderlich.'
  } else if (input.required && value) {
    console.log(`[validateInput] Required field validation passed for ${validationKey}:`, {
      value,
      required: input.required,
      hasValue: !!value
    })
  }

  // Check min/max length for text fields only
  if (isValid && value && (input.type === 'text' || input.type === 'textarea')) {
    console.log(`[validateInput] Checking min/max length for ${validationKey}:`, {
      value: value.length,
      minLength: input.minLength,
      maxLength: input.maxLength,
      type: input.type
    })
    if (input.minLength && input.minLength > 0 && value.length < input.minLength) {
      console.log(`[validateInput] Min length validation failed for ${validationKey}`)
      isValid = false
      errorMessage = validationMessages[validationKey]?.minLength
    } else if (input.maxLength && input.maxLength > 0 && value.length > input.maxLength) {
      console.log(`[validateInput] Max length validation failed for ${validationKey}`)
      isValid = false
      errorMessage = validationMessages[validationKey]?.maxLength
    }
  }

  // Check pattern for text fields only
  if (isValid && value && input.pattern && (input.type === 'text' || input.type === 'textarea')) {
    console.log(`[validateInput] Checking pattern for ${validationKey}:`, {
      pattern: input.pattern,
      value: value
    })
    const pattern = new RegExp(input.pattern)
    if (!pattern.test(value)) {
      console.log(`[validateInput] Pattern validation failed for ${validationKey}`)
      isValid = false
      errorMessage = validationMessages[validationKey]?.pattern
    }
  }

  // Check min/max for number inputs
  if (isValid && input.type === 'number' && value) {
    const num = Number(value)
    if (input.min && num < Number(input.min)) {
      isValid = false
      errorMessage = validationMessages[validationKey]?.range
    } else if (input.max && num > Number(input.max)) {
      isValid = false
      errorMessage = validationMessages[validationKey]?.range
    }
  }

  // Check datetime-local
  if (isValid && input.type === 'datetime-local' && value) {
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      isValid = false
      errorMessage = validationMessages[validationKey]?.invalid
    } else if (input.min) {
      const minDate = new Date(input.min)
      if (date < minDate) {
        isValid = false
        errorMessage = validationMessages[validationKey]?.min
      }
    }
  }

  // Update error message display only if showError is true and we're not initializing
  if (errorElement && showError && !isInitializing) {
    console.log(`[validateInput] Updating error display for ${validationKey}:`, {
      isValid,
      showError,
      hasFocus: document.activeElement === input,
      errorMessage,
      isInitializing,
    })

    if (!isValid) {
      errorElement.textContent = errorMessage
      errorElement.style.display = 'block'
      errorElement.classList.add('show')
    } else {
      errorElement.style.display = 'none'
      errorElement.classList.remove('show')
      errorElement.textContent = ''
    }
  }

  return isValid
}

// Function to validate all inputs in a form
function validateForm() {
  console.log('Starting form validation')
  const form = document.getElementById('lotteryForm')
  const inputs = form.querySelectorAll('input[required], textarea[required]')
  let isValid = true

  inputs.forEach((input) => {
    const errorElement = document.getElementById(`${input.id}Error`) ||
      input.closest('.paket')?.querySelector('.paketTitle-error')

    // Pass false for showError to prevent showing errors during form validation
    const inputValid = validateInput(input, errorElement, false)
    console.log(`Validating ${input.id || input.className}:`, inputValid)
    if (!inputValid) {
      isValid = false
    }
  })

  // Validate all paket titles
  document.querySelectorAll('.paketTitle').forEach((input) => {
    const errorElement = input.closest('.paket').querySelector('.paketTitle-error')
    // Pass false for showError to prevent showing errors during form validation
    const inputValid = validateInput(input, errorElement, false)
    console.log(`Validating paket title:`, inputValid)
    if (!inputValid) {
      isValid = false
    }
  })

  // Validate participants input
  const participantsInput = document.getElementById('participantsInput')
  if (participantsInput && participantsInput.value.trim()) {
    const { participants, errors: parseErrors } = parseParticipantsInput(participantsInput.value)
    const pakets = document.querySelectorAll('.paket')
    const packetValidationErrors = validatePacketNumbers(participants, pakets.length)
    const allErrors = [...parseErrors, ...packetValidationErrors]

    if (allErrors.length > 0) {
      isValid = false
    }
  }

  console.log('Form validation complete:', isValid)
  return isValid
}

// Modify the drop event handler to use the initialization path
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
      initializeApp(data)
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

// Initialize the UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
  isInitializing = true // Set flag at start of initialization

  try {
    console.log('DOMContentLoaded: Starting initialization')

    const form = document.getElementById('lotteryForm')
    console.log('DOMContentLoaded: Form exists:', !!form)

    const paketsContainer = document.getElementById('pakets-container')
    console.log('DOMContentLoaded: Pakets container exists:', !!paketsContainer)

    const addPaketButton = document.getElementById('addPaket')
    console.log('DOMContentLoaded: Add paket button exists:', !!addPaketButton)

    const drawButton = document.getElementById('drawButton')
    console.log('DOMContentLoaded: Draw button exists:', !!drawButton)

    // Initially hide the results container
    const resultsContainer = document.getElementById('results')
    console.log('DOMContentLoaded: Results container exists:', !!resultsContainer)
    if (resultsContainer && resultsContainer.style) {
      console.log('DOMContentLoaded: Initially hiding results container')
      resultsContainer.style.display = 'none'
    }

    // Add download button event listener
    const downloadButton = document.getElementById('downloadLottery')
    console.log('DOMContentLoaded: Download button exists:', !!downloadButton)
    if (downloadButton) {
      downloadButton.addEventListener('click', () => {
        try {
          downloadLotteryData()
        } catch (error) {
          console.error('Error downloading lottery data:', error)
          alert('Fehler beim Herunterladen der Daten')
        }
      })
    }

    // Focus the lottery number input
    const lotteryNumberInput = document.getElementById('lotteryNumber')
    console.log('DOMContentLoaded: Lottery number input exists:', !!lotteryNumberInput)
    if (lotteryNumberInput) {
      lotteryNumberInput.focus()
    }

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

    // Load saved data when page opens
    console.log('DOMContentLoaded: Loading saved data')
    const savedData = loadLotteryData()
    console.log('DOMContentLoaded: Saved data exists:', !!savedData)
    if (savedData) {
      try {
        console.log('DOMContentLoaded: Initializing app with saved data')
        initializeApp(savedData)
      } catch (error) {
        console.error('DOMContentLoaded: Error initializing app with saved data:', error)
        alert(error.message)
      }
    }

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



    // Remove paket
    function removePaket(event) {
      const paket = event.target.closest('.paket')
      const paketsContainer = paket.closest('#pakets-container')
      if (paketsContainer.children.length > 1) {
        paket.remove()
        renumberPakets()
        updateRemoveButtons()
        updateParticipantsOverview()
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

    // Handle paket input events
    paketsContainer.addEventListener('input', (event) => {
      if (event.target.classList.contains('paketTitle')) {
        updateParticipantsOverview()
        updateDrawButton()
      }
    })

    // Handle paket container clicks
    paketsContainer.addEventListener('click', (event) => {
      if (event.target.classList.contains('remove-paket')) {
        removePaket(event)
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
      updateParticipantsOverview()
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

    // Add event listeners for participants input
    const participantsInput = document.getElementById('participantsInput')
    if (participantsInput) {
      saveEvents.forEach((eventType) => {
        participantsInput.addEventListener(eventType, () => {
          updateParticipantsOverview()
          updateDrawButton()
        })
      })
    }

    // Modify draw button click handler to use makeLotteryData
    drawButton.addEventListener('click', async () => {
      console.log('Draw button clicked')

      if (!validateForm()) {
        console.log('Form validation failed')
        return
      }
      console.log('Form validation passed')

      try {
        const { data: lotteryData, errors } = makeLotteryData()
        console.log('Lottery data:', lotteryData)
        console.log('Validation errors:', errors)

        if (errors && errors.length > 0) {
          console.log('Validation errors found')
          throw new Error(`Validierungsfehler:\n${errors.join('\n')}`)
        }

        // Validate data before proceeding
        if (!lotteryData.packets.every((p) => p.title)) {
          console.log('Packet title validation failed')
          throw new Error('Bitte gib für jedes Paket einen Titel ein.')
        }
        console.log('Packet title validation passed')

        // Create and run lottery
        console.log('Creating lottery instance')
        const lottery = new Lottery(lotteryData)
        console.log('Initializing lottery')
        await lottery.initialize()
        console.log('Drawing winners')
        const results = await lottery.draw()
        console.log('Drawing complete, results:', results)

        // Store results in localStorage
        console.log('Storing results in localStorage')
        localStorage.setItem('lotteryData', JSON.stringify(results))

        // Reinitialize the app with the results to make it read-only
        console.log('Reinitializing app with results')
        initializeApp(results)
      } catch (error) {
        console.error('Error in draw process:', error)
        document.getElementById('results').innerHTML = `
          <div class="error-message">
            <h3>Fehler</h3>
            <p>${error.message}</p>
          </div>
        `
      }
    })

    // Initialize remove buttons visibility and button state only if not in read-only mode
    const isReadOnly = Array.isArray(savedData?.drawings)
    console.log('DOMContentLoaded: Is read-only mode:', isReadOnly)
    if (!isReadOnly) {
      console.log('DOMContentLoaded: Initializing remove buttons (not in read-only mode)')
      updateRemoveButtons()
    }
    updateDrawButton()

    // Add validation event listeners for all inputs and textareas
    const inputs = form.querySelectorAll('input, textarea')

    inputs.forEach((input) => {
      console.log(`[DOMContentLoaded] Setting up validation for input:`, {
        id: input.id,
        type: input.type,
        required: input.required,
      })

      // Create error element if it doesn't exist
      let errorElement =
        document.getElementById(`${input.id}Error`) ||
        input.closest('.paket')?.querySelector('.paketTitle-error')

      if (!errorElement) {
        const formGroup =
          input.closest('.form-group') ||
          input.closest('.paket')
        if (formGroup) {
          errorElement = document.createElement('div')
          if (input.id) {
            errorElement.id = `${input.id}Error`
          } else if (input.classList.contains('paketTitle')) {
            errorElement.className = 'paketTitle-error'
          }
          formGroup.appendChild(errorElement)
        }
      }

      // Validate on blur - this should always run when leaving a field
      input.addEventListener('blur', (e) => {
        // Skip validation if we're initializing
        if (isInitializing) {
          console.log(
            `[blur] Skipping validation during initialization for ${input.id || input.className}`,
          )
          return
        }

        console.log(`[blur] Event fired for ${input.id || input.className}:`, {
          value: input.value,
          type: input.type,
          required: input.required,
        })

        // For number inputs, ensure we validate the cleaned value
        if (input.type === 'number') {
          const oldValue = input.value
          input.value = input.value.replace(/[^0-9]/g, '')
          console.log(`[blur] Cleaned number input:`, {
            oldValue,
            newValue: input.value,
          })
        }
        // Show validation error when leaving the field
        validateInput(input, errorElement, true)
        updateDrawButton()
      })

      // For number inputs, handle input validation differently
      if (input.type === 'number') {
        input.addEventListener('input', (e) => {
          console.log(`[input] Number input event for ${input.id}:`, {
            originalValue: e.target.value,
            hasFocus: document.activeElement === input,
          })

          // Only remove non-digit characters from the new input
          const newValue = e.target.value.replace(/[^0-9]/g, '')
          // Only update if the value actually changed (to avoid cursor jumping)
          if (newValue !== e.target.value) {
            console.log(`[input] Updating number input value:`, {
              oldValue: e.target.value,
              newValue,
            })
            e.target.value = newValue
          }

          // Update title
          const lotteryNumber = e.target.value.trim()
          const lotteryName = document.getElementById('lotteryName').value.trim()
          if (lotteryNumber && lotteryName) {
            updatePageTitle(`Verlosung Spende ${lotteryNumber}: ${lotteryName}`)
          } else {
            updatePageTitle('Verlosung Spende')
          }
          // Update button state without showing errors
          updateDrawButton()
        })
      } else {
        // For non-number inputs, only update button state on input
        input.addEventListener('input', () => {
          // Update button state without showing errors
          updateDrawButton()
        })
      }
    })

    console.log('DOMContentLoaded: Completed initialization')
  } finally {
    isInitializing = false // Reset flag after initialization
    // Only update button state after initialization is complete
    updateDrawButton()
  }
})

// Function to download lottery data
function downloadLotteryData() {
  const { data } = makeLotteryData()
  const filename = createFilename(data.title)
  const jsonStr = JSON.stringify(data, null, 4)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.json`
  a.click()
  URL.revokeObjectURL(url)
}
