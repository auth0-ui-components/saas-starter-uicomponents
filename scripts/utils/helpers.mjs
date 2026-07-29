import * as readline from "node:readline/promises"
import { $ } from "execa"

/**
 * Wait for user confirmation before proceeding
 */
export async function confirmWithUser(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const answer = await rl.question(`${message} (y/N): `)
  rl.close()

  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes"
}

/**
 * Prompt the user to select one option from a list.
 * @param {string} message - The prompt message.
 * @param {Array<{name: string, value: string, description?: string}>} options - Choices.
 * @returns {Promise<string>} The `value` of the selected option.
 */
export async function selectOptionFromList(message, options) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  console.log(`\n${message}`)
  options.forEach((option, index) => {
    console.log(`  ${index + 1}) ${option.name}`)
    if (option.description) {
      console.log(`     ${option.description}`)
    }
  })

  try {
    while (true) {
      const answer = await rl.question(
        `\nEnter your choice (1-${options.length}): `
      )
      const choice = Number.parseInt(answer.trim(), 10)
      if (Number.isInteger(choice) && choice >= 1 && choice <= options.length) {
        return options[choice - 1].value
      }
      console.log(
        `Invalid choice. Please enter a number between 1 and ${options.length}.`
      )
    }
  } finally {
    rl.close()
  }
}

/**
 * Wait until an Action is built
 */
export async function waitUntilActionIsBuilt(actionId) {
  while (true) {
    const { stdout } = await $`auth0 actions show ${actionId} --json`
    const action = JSON.parse(stdout)
    if (action.status === "built") {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }
}
