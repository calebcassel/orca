import { describe, expect, it } from 'vitest'

import {
  shouldUseRendererBackedCodexTerminal,
  shouldUseRendererBackedInteractiveTerminal
} from './codex-command-classification'

describe('shouldUseRendererBackedCodexTerminal', () => {
  it('uses renderer-backed terminal creation for interactive Codex sessions', () => {
    expect(shouldUseRendererBackedCodexTerminal('codex')).toBe(true)
    expect(shouldUseRendererBackedCodexTerminal('codex -m gpt-5 "fix the flaky test"')).toBe(true)
    expect(shouldUseRendererBackedCodexTerminal('codex resume --last')).toBe(true)
    expect(shouldUseRendererBackedCodexTerminal('codex fork')).toBe(true)
    expect(shouldUseRendererBackedCodexTerminal('codex login')).toBe(true)
    expect(shouldUseRendererBackedCodexTerminal('codex cloud')).toBe(true)
    expect(shouldUseRendererBackedCodexTerminal('codex -c active=cloud cloud')).toBe(true)
    expect(shouldUseRendererBackedCodexTerminal('codex.cmd resume --last')).toBe(true)
    expect(shouldUseRendererBackedCodexTerminal('env OPENAI_API_KEY=stub codex')).toBe(true)
  })

  it('keeps one-shot Codex commands on the background path', () => {
    expect(shouldUseRendererBackedCodexTerminal('codex exec summarize')).toBe(false)
    expect(shouldUseRendererBackedCodexTerminal('codex -m gpt-5 review')).toBe(false)
    expect(shouldUseRendererBackedCodexTerminal('codex login status')).toBe(false)
    expect(shouldUseRendererBackedCodexTerminal('codex login --with-api-key')).toBe(false)
    expect(shouldUseRendererBackedCodexTerminal('codex cloud list --json')).toBe(false)
    expect(shouldUseRendererBackedCodexTerminal('codex -c active=cloud cloud list --json')).toBe(
      false
    )
    expect(shouldUseRendererBackedCodexTerminal('codex cloud --enable foo list --json')).toBe(false)
    expect(
      shouldUseRendererBackedCodexTerminal(
        'env -u DEBUG CODEX_HOME=/tmp/codex codex exec summarize'
      )
    ).toBe(false)
    expect(shouldUseRendererBackedCodexTerminal('codex cloud exec "fix it"')).toBe(false)
    expect(shouldUseRendererBackedCodexTerminal('codex cloud --version')).toBe(false)
    expect(shouldUseRendererBackedCodexTerminal('codex --help')).toBe(false)
  })

  it('ignores non-Codex commands', () => {
    expect(shouldUseRendererBackedCodexTerminal(undefined)).toBe(false)
    expect(shouldUseRendererBackedCodexTerminal('claude')).toBe(false)
    expect(shouldUseRendererBackedCodexTerminal('npm exec codex')).toBe(false)
  })
})

describe('shouldUseRendererBackedInteractiveTerminal', () => {
  it('uses renderer-backed terminal creation for interactive Claude sessions', () => {
    expect(shouldUseRendererBackedInteractiveTerminal('claude')).toBe(true)
    expect(shouldUseRendererBackedInteractiveTerminal('claude --prefill "review this"')).toBe(true)
    expect(shouldUseRendererBackedInteractiveTerminal('/opt/anthropic/bin/claude')).toBe(true)
    expect(shouldUseRendererBackedInteractiveTerminal('env ANTHROPIC_BASE_URL=test claude')).toBe(
      true
    )
  })

  it('keeps one-shot Claude commands on the background path', () => {
    expect(shouldUseRendererBackedInteractiveTerminal('claude -p "summarize"')).toBe(false)
    expect(shouldUseRendererBackedInteractiveTerminal('claude --print "summarize"')).toBe(false)
    expect(shouldUseRendererBackedInteractiveTerminal('claude --help')).toBe(false)
    expect(shouldUseRendererBackedInteractiveTerminal('claude --version')).toBe(false)
  })

  it('preserves Codex command classification', () => {
    expect(shouldUseRendererBackedInteractiveTerminal('codex')).toBe(true)
    expect(shouldUseRendererBackedInteractiveTerminal('codex exec summarize')).toBe(false)
  })
})

describe('shell launch prefixes', () => {
  it.each([
    ['exec codex --model gpt-5.6-sol -c model_reasoning_effort=xhigh', true],
    ['exec env AGENT_NICK=sa /home/caleb/bin/codex --model gpt-5.6-sol', true],
    ['AGENT_NICK=sa exec env -u DEBUG codex resume --last', true],
    ['exec env AGENT_LABEL="Factory agent" "/opt/agent tools/codex" --model gpt-5.6-sol', true],
    ['exec env AGENT_NICK=sa codex exec summarize', false],
    ['exec env AGENT_NICK=sa codex -m gpt-5.6-sol review', false],
    ['exec env AGENT_NICK=sa codex --help', false],
    ['bash -lc "codex"', false],
    ['exec bash -lc "codex"', false],
    ['npm exec codex', false],
    ['/opt/exec codex', false],
    ['exec -a codex bash', false],
    ['exec exec codex', false],
    ['exec AGENT_NICK=sa codex', false]
  ])('classifies %s as renderer-backed=%s', (command, expected) => {
    expect(shouldUseRendererBackedCodexTerminal(command)).toBe(expected)
    expect(shouldUseRendererBackedInteractiveTerminal(command)).toBe(expected)
  })

  it.each([
    ['exec env AGENT_NICK=sa claude --model sonnet', true],
    ['exec env AGENT_NICK=sa claude --print summarize', false]
  ])('classifies Claude launch %s as renderer-backed=%s', (command, expected) => {
    expect(shouldUseRendererBackedInteractiveTerminal(command)).toBe(expected)
  })

  it('recognizes Codex after more than 32 environment assignments', () => {
    const environment = 'AGENT_DUMMY=x '.repeat(40)
    expect(
      shouldUseRendererBackedCodexTerminal(`exec env ${environment}codex --model gpt-5.6-sol`)
    ).toBe(true)
    expect(
      shouldUseRendererBackedInteractiveTerminal(`exec env ${environment}codex --model gpt-5.6-sol`)
    ).toBe(true)
  })

  it('keeps a headless Codex command after many assignments on the background path', () => {
    const environment = 'AGENT_DUMMY=x '.repeat(40)
    expect(
      shouldUseRendererBackedCodexTerminal(`exec env ${environment}codex exec summarize`)
    ).toBe(false)
    expect(
      shouldUseRendererBackedInteractiveTerminal(`exec env ${environment}codex exec summarize`)
    ).toBe(false)
  })
})
