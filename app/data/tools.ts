/**
 * The tools LightKit offers.
 *
 * One list, because two things read it: the menu renders it, and the header
 * shows the active tool's name under the wordmark. Kept here rather than inside
 * the menu so neither can drift from the other.
 */

export interface Tool {
  id: string
  /** Its own URL. Each tool is a real page, so a pilot can bookmark one. */
  path: string
  label: string
  /** One line saying what this tool tells you. Opens the info modal's body. */
  note: string
  /** The rest of the explanation, one string per paragraph. Lives behind the
      info button beside the tool, never on the menu row itself. */
  about: string[]
}

export const tools: Tool[] = [
  {
    id: 'solar',
    path: '/solar',
    label: 'Solar Planner',
    note: 'Golden hour, blue hour and the weather for a place.',
    about: [
      'Pick a spot on the map and a date. The planner works out when the sun rises and sets there, and when the good light falls either side of it.',
      'Golden hour is the warm, low light just after sunrise and just before sunset. Blue hour is the cool light before the sun comes up and after it has gone down. Both are short, and both move through the year.',
      'If you add a weather key in Settings, it also shows wind, gusts, cloud and rain for that place, with a plain go or no-go on the wind.'
    ]
  },
  {
    id: 'nd',
    path: '/nd',
    label: 'ND Filters',
    note: 'Which filter to fit for the light you have.',
    about: [
      'Read the shutter speed off your camera before you fit anything, then tell the tool what frame rate you are shooting. It works out which ND filter gets you there.',
      'It also shows how far that filter lands from your target and what every other strength would give you, so you can see your options at a glance.',
      'Pick your aircraft or camera and the list narrows to the filters sold for it. Every other strength stays one tap away.'
    ]
  }
]

/** The tool a URL belongs to. Falls back to the first tool, which `/` lands on. */
export const toolForPath = (path: string): Tool =>
  tools.find(tool => path.startsWith(tool.path)) ?? tools[0]!
