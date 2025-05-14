import { Lottery } from './lottery.js'

// Global counter for pakets
let paketCounter = 1

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
    const participants = Array.from(paket.querySelectorAll('.participantName'))
      .map((input) => ({
        name: input.value.trim(),
        tickets: 1,
      }))
      .filter((p) => p.name)
    const paketTitle = paket.querySelector('.paketTitle').value.trim()

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
              validationErrors.push(
                `Paket #${index + 1}, Teilnehmer #${pIndex + 1}: Name fehlt`,
              )
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
  
  // Remove all delete buttons except the clear-lottery button
  const buttons = document.querySelectorAll('.remove-paket, .remove-participant, .add-participant')
  console.log('makeFormReadOnly: Found buttons to remove:', buttons.length)
  buttons.forEach(button => {
    if (button) {
      console.log('makeFormReadOnly: Removing button:', button.className)
      button.remove()
    }
  })

  // Make all inputs read-only
  const inputs = document.querySelectorAll('input')
  console.log('makeFormReadOnly: Found inputs:', inputs.length)
  inputs.forEach(input => {
    if (input) {
      console.log('makeFormReadOnly: Making input read-only:', input.id || input.className)
      input.readOnly = true
      input.classList.add('readonly')
    }
  })

  // Hide the add paket button if it exists
  const addPaketButton = document.getElementById('addPaket')
  console.log('makeFormReadOnly: Add paket button exists:', !!addPaketButton)
  if (addPaketButton && addPaketButton.style) {
    console.log('makeFormReadOnly: Hiding add paket button')
    addPaketButton.style.display = 'none'
  }

  // Hide the draw button if it exists
  const drawButton = document.getElementById('drawButton')
  console.log('makeFormReadOnly: Draw button exists:', !!drawButton)
  if (drawButton && drawButton.style) {
    console.log('makeFormReadOnly: Hiding draw button')
    drawButton.style.display = 'none'
  }

  // Hide the form if it exists
  const form = document.getElementById('lotteryForm')
  console.log('makeFormReadOnly: Form exists:', !!form)
  if (form && form.style) {
    console.log('makeFormReadOnly: Making form read-only')
    form.style.opacity = '0.7'
    form.style.pointerEvents = 'none'
  }
  
  console.log('makeFormReadOnly: Completed')
}

// Function to populate form with saved data
function populateFormWithData(data) {
  console.log('populateFormWithData: Starting with data:', data)
  if (!data) {
    console.log('populateFormWithData: No data provided')
    return
  }

  // Check if this is a results file (has drawings)
  const isResultsFile = Array.isArray(data.drawings)
  console.log('populateFormWithData: Is results file:', isResultsFile)

  // Update page title with saved title
  console.log('populateFormWithData: Updating page title')
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
  console.log('populateFormWithData: Pakets container exists:', !!paketsContainer)
  paketsContainer.innerHTML = ''

  // Add saved pakets
  data.packets.forEach((paket) => {
    const newPaket = createPaket()
    const paketTitleInput = newPaket.querySelector('.paketTitle')
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

    // Only add the "add participant" button if this is not a results file
    if (!isResultsFile) {
      const addButton = document.createElement('button')
      addButton.type = 'button'
      addButton.className = 'add-participant'
      addButton.textContent = '+ Neuer Teilnehmer'
      participantsContainer.appendChild(addButton)
    }

    paketsContainer.appendChild(newPaket)
  })

  // If this is a results file, make the form read-only
  if (isResultsFile) {
    console.log('populateFormWithData: Making form read-only')
    makeFormReadOnly()
  } else {
    // Update UI state for normal lottery data
    console.log('populateFormWithData: Updating UI state')
    updateRemoveButtons()
    updateDrawButton()
  }
  
  console.log('populateFormWithData: Completed')
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

  // Get all required inputs
  const form = document.getElementById('lotteryForm')
  const inputs = form.querySelectorAll('input[required]')
  let isValid = true

  // Debug: print values of all required inputs
  inputs.forEach((input) => {
    console.log(
      `Field ${input.id || input.className}: value='${input.value}', type='${input.type}'`,
    )
  })

  // Validate all required inputs
  inputs.forEach((input) => {
    const errorElement =
      document.getElementById(`${input.id}Error`) ||
      input.closest('.paket')?.querySelector('.paketTitle-error') ||
      input.closest('.participants-container')?.querySelector('.participantName-error')

    // Pass false for showError to prevent showing errors during button state updates
    const valid = validateInput(input, errorElement, false)
    console.log(`Validating ${input.id || input.className}:`, valid)
    if (!valid) {
      isValid = false
    }
  })

  // Validate all paket titles
  document.querySelectorAll('.paketTitle').forEach((input) => {
    const errorElement = input.closest('.paket').querySelector('.paketTitle-error')
    // Pass false for showError to prevent showing errors during button state updates
    const valid = validateInput(input, errorElement, false)
    console.log(`Validating paket title:`, valid)
    if (!valid) {
      isValid = false
    }
  })

  // Validate all participant names that have a value
  document.querySelectorAll('.participantName').forEach((input) => {
    if (input.value.trim()) {
      const errorElement = input
        .closest('.participants-container')
        .querySelector('.participantName-error')
      // Pass false for showError to prevent showing errors during button state updates
      const valid = validateInput(input, errorElement, false)
      console.log(`Validating participant name:`, valid)
      if (!valid) {
        isValid = false
      }
    }
  })

  // Check if we have at least one paket
  const pakets = document.querySelectorAll('.paket')
  console.log('Number of pakets:', pakets.length)
  if (pakets.length === 0) {
    isValid = false
  }

  // Check if all pakets have at least one participant
  const allPaketsHaveParticipants = Array.from(pakets).every((paket, idx) => {
    const participants = paket.querySelectorAll('.participantName')
    const hasParticipant = Array.from(participants).some((input) => input.value.trim())
    console.log(`Paket #${idx + 1} has participant:`, hasParticipant)
    return hasParticipant
  })

  if (!allPaketsHaveParticipants) {
    isValid = false
  }

  // Update button state
  drawButton.disabled = !isValid
  console.log('Draw button disabled:', drawButton.disabled, 'isValid:', isValid)
}

// Create a new participant input
function createParticipantInput() {
  const div = document.createElement('div')
  div.className = 'participant-input'
  div.innerHTML = `
        <div class="input-wrapper">
            <input type="text" placeholder="Teilnehmer Name" class="participantName" required minlength="2" maxlength="50" pattern="[a-zA-Z0-9_-]+">
            <div class="validation-message participantName-error"></div>
        </div>
        <button type="button" class="remove-participant">×</button>
    `
  return div
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
        <div class="participants-container">
            ${createParticipantInput().outerHTML}
            <button type="button" class="add-participant">+ Neuer Teilnehmer</button>
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
  participantName: {
    required: 'Bitte gib den Nicknamen des Teilnehmers ein.',
    minLength: 'Der Nickname muss mindestens 2 Zeichen lang sein.',
    maxLength: 'Der Nickname darf maximal 50 Zeichen lang sein.',
    pattern: 'Der Nickname darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten.',
  },
}

// Function to validate a single input field
function validateInput(input, errorElement, showError = true) {
  const value = input.value.trim()
  let isValid = true
  let errorMessage = ''
  let validationKey = input.id
  if (!validationKey) {
    if (input.classList.contains('paketTitle')) validationKey = 'paketTitle'
    else if (input.classList.contains('participantName')) validationKey = 'participantName'
  }

  // Check required
  if (input.required && !value) {
    isValid = false
    errorMessage = validationMessages[validationKey]?.required || 'Dieses Feld ist erforderlich.'
  }

  // Check min/max length for text fields only
  if (isValid && value && (input.type === 'text' || input.type === 'textarea')) {
    if (input.minLength && value.length < input.minLength) {
      isValid = false
      errorMessage = validationMessages[validationKey]?.minLength
    } else if (input.maxLength && value.length > input.maxLength) {
      isValid = false
      errorMessage = validationMessages[validationKey]?.maxLength
    }
  }

  // Check pattern for text fields only
  if (isValid && value && input.pattern && (input.type === 'text' || input.type === 'textarea')) {
    const pattern = new RegExp(input.pattern)
    if (!pattern.test(value)) {
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

  // Update error message display only if showError is true
  if (errorElement && showError) {
    // Create error element if it doesn't exist
    if (!errorElement.parentNode) {
      const formGroup =
        input.closest('.form-group') ||
        input.closest('.paket') ||
        input.closest('.participants-container')
      if (formGroup) {
        // Create error element if it doesn't exist
        const newErrorElement = document.createElement('div')
        newErrorElement.className = errorElement.className
        newErrorElement.id = errorElement.id
        formGroup.appendChild(newErrorElement)
        errorElement = newErrorElement
      }
    }

    if (!isValid) {
      errorElement.textContent = errorMessage
      errorElement.style.display = 'block'
      errorElement.classList.add('show')
    } else {
      errorElement.style.display = 'none'
      errorElement.classList.remove('show')
    }
  }

  return isValid
}

// Function to validate all inputs in a form
function validateForm() {
  console.log('Starting form validation')
  const form = document.getElementById('lotteryForm')
  const inputs = form.querySelectorAll('input[required]')
  let isValid = true

  inputs.forEach((input) => {
    const errorElement =
      document.getElementById(`${input.id}Error`) ||
      input.closest('.paket')?.querySelector('.paketTitle-error') ||
      input.closest('.participants-container')?.querySelector('.participantName-error')

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

  // Validate all participant names that have a value
  document.querySelectorAll('.participantName').forEach((input) => {
    if (input.value.trim()) {
      const errorElement = input
        .closest('.participants-container')
        .querySelector('.participantName-error')
      // Pass false for showError to prevent showing errors during form validation
      const inputValid = validateInput(input, errorElement, false)
      console.log(`Validating participant name:`, inputValid)
      if (!inputValid) {
        isValid = false
      }
    }
  })

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
  console.log('DOMContentLoaded: Starting initialization')
  
  const form = document.getElementById('lotteryForm')
  console.log('DOMContentLoaded: Form exists:', !!form)
  
  const paketsContainer = document.getElementById('pakets-container')
  console.log('DOMContentLoaded: Pakets container exists:', !!paketsContainer)
  
  const addPaketButton = document.getElementById('addPaket')
  console.log('DOMContentLoaded: Add paket button exists:', !!addPaketButton)
  
  const drawButton = document.getElementById('drawButton')
  console.log('DOMContentLoaded: Draw button exists:', !!drawButton)

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

  // Add new participant input
  function addNewParticipant(participantsContainer) {
    // Remove the add button temporarily
    const addButton = participantsContainer.querySelector('.add-participant')
    addButton.remove()

    // Add the new participant input
    const newInput = createParticipantInput()
    participantsContainer.appendChild(newInput)

    // Add validation event listeners to the new input
    const input = newInput.querySelector('input')
    const errorElement = newInput.querySelector('.participantName-error')

    // Only validate on blur
    input.addEventListener('blur', () => {
      validateInput(input, errorElement, true)
      updateDrawButton()
    })

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
      event.target.classList.contains('participantName') ||
      event.target.classList.contains('paketTitle')
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
    if (event.target.classList.contains('participantName')) {
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

  // Modify draw button click handler to use makeLotteryData
  drawButton.addEventListener('click', async () => {
    console.log('Draw button clicked')

    if (!validateForm()) {
      console.log('Form validation failed')
      return
    }
    console.log('Form validation passed')

    try {
      const lotteryData = makeLotteryData()
      console.log('Lottery data:', lotteryData)

      // Validate data before proceeding
      if (!lotteryData.packets.every((p) => p.title)) {
        console.log('Packet title validation failed')
        throw new Error('Bitte geben Sie für jedes Paket einen Titel ein.')
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

      // Display results in HTML format
      displayResults(results)
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

  // Add validation event listeners for all inputs
  const inputs = form.querySelectorAll('input')

  inputs.forEach((input) => {
    // Create error element if it doesn't exist
    let errorElement =
      document.getElementById(`${input.id}Error`) ||
      input.closest('.paket')?.querySelector('.paketTitle-error') ||
      input.closest('.participants-container')?.querySelector('.participantName-error')

    if (!errorElement) {
      const formGroup =
        input.closest('.form-group') ||
        input.closest('.paket') ||
        input.closest('.participants-container')
      if (formGroup) {
        errorElement = document.createElement('div')
        if (input.id) {
          errorElement.id = `${input.id}Error`
        } else if (input.classList.contains('paketTitle')) {
          errorElement.className = 'paketTitle-error'
        } else if (input.classList.contains('participantName')) {
          errorElement.className = 'participantName-error'
        }
        formGroup.appendChild(errorElement)
      }
    }

    // Validate on blur - this should always run when leaving a field
    input.addEventListener('blur', () => {
      // For number inputs, ensure we validate the cleaned value
      if (input.type === 'number') {
        input.value = input.value.replace(/[^0-9]/g, '')
      }
      // Show validation error when leaving the field
      validateInput(input, errorElement, true)
      updateDrawButton()
    })

    // For number inputs, handle input validation differently
    if (input.type === 'number') {
      input.addEventListener('input', (e) => {
        // Only remove non-digit characters from the new input
        const newValue = e.target.value.replace(/[^0-9]/g, '')
        // Only update if the value actually changed (to avoid cursor jumping)
        if (newValue !== e.target.value) {
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
})
