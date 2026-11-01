/**
 * The tools LightKit offers.
 *
 * One list, because three things read it: the menu renders it, the header shows
 * the active tool's name under the wordmark, and the start page draws a plate for
 * each. Kept here rather than inside any of them so none can drift from the rest.
 */

export interface Tool {
  id: string
  /** Its own URL. Each tool is a real page, so a pilot can bookmark one. */
  path: string
  label: string
  /** One line saying what this tool tells you. Opens the info modal's body. */
  note: string
  /** The picture on its start-page plate, painted by scripts/build-card-art.mjs. */
  art: string
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
    art: '/cards/solar.webp',
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
    art: '/cards/nd.webp',
    about: [
      'Read the shutter speed off your camera before you fit anything, then tell the tool what frame rate you are shooting. It works out which ND filter gets you there.',
      'It also shows how far that filter lands from your target and what every other strength would give you, so you can see your options at a glance.',
      'Pick your aircraft or camera and the list narrows to the filters sold for it. Every other strength stays one tap away.'
    ]
  }
]

/**
 * Tools that do not exist yet, from BACKLOG.md. The start page shows them greyed
 * out; the menu does not list them, because it only lists places you can go.
 * Building one means moving its entry up into `tools`.
 */
export type PlannedTool = Pick<Tool, 'id' | 'label' | 'note' | 'art'>

export const plannedTools: PlannedTool[] = [
  {
    id: 'shadow',
    label: 'Shadow Planner',
    note: 'See where the shadows fall at the hour you want to be there.',
    art: '/cards/shadow.webp'
  },
  {
    id: 'moon',
    label: 'Moon and Darkness',
    note: 'Moonrise, moonset and the hours of true dark.',
    art: '/cards/moon.webp'
  },
  {
    id: 'timelapse',
    label: 'Time-lapse',
    note: 'The right interval for the event and the clip you want.',
    art: '/cards/timelapse.webp'
  },
  {
    id: 'long-exposure',
    label: 'Long Exposure',
    note: 'New shutter times for heavy filters, with a countdown.',
    art: '/cards/long-exposure.webp'
  },
  {
    id: 'hyperfocal',
    label: 'Hyperfocal',
    note: 'The nearest focus that keeps the far distance sharp.',
    art: '/cards/hyperfocal.webp'
  }
]

/** The tool a URL belongs to, or null on a page that is not a tool, such as `/`. */
export const toolForPath = (path: string): Tool | null =>
  tools.find(tool => path.startsWith(tool.path)) ?? null
