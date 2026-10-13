# Ward Sensory Environment Monitor

A working prototype of an application that lets clinical staff see the real-time
sensory environment of a secure mental health ward, so they can support patients
with autism before conditions cause distress.

The ward is fitted with three kinds of sensor. Foot-traffic sensors count people
and show where groups are gathering. Sound sensors measure sound pressure and
show when levels are rising or above the level set for an area. Light meters
measure illuminance and separate daylight from artificial light.

**This is a design prototype, not a clinical system.** Every reading is invented.
Patients appear as reference numbers with `[NAME]` placeholders. There is no
backend, no authentication and no sensor integration.

## Viewing it

Open `index.html` in any browser. No build step and no server are needed.

If GitHub Pages is enabled for this repository (Settings → Pages → deploy from
`main`, root folder), the prototype is served at:

```
https://dpnorton66-cyber.github.io/ASD/ward-sensory-monitor/
```

## The five screens

| File | Screen | Purpose |
|---|---|---|
| `index.html` | Live ward | Ward plan with live status over every monitored area, plus the attention queue and all three sensor channels. |
| `zone.html` | Zone detail | One area in depth: sound and occupancy traced across the day, light split into daylight and artificial, who is present, what staff recorded. |
| `patient.html` | Patient match | One patient's sensory limits against the conditions where they are, their day so far, and every area on the ward ranked against their profile. |
| `patterns.html` | Patterns and thresholds | Sound by area and hour across the week, the recurring pressure points, the set levels and sensor health. |
| `handheld.html` | Handheld | The phone view for staff on the floor: filtered alerts, one action each, acknowledgement. |

## The model

### Monitored areas

Twelve areas carry sensors:

lounge, dining, supervised kitchen, garden access corridor, secure garden,
main corridor, bedroom wing A (B01–B06), bedroom wing B (B07–B10),
bedroom wing C (B11–B14), group therapy, sensory / quiet room,
de-escalation suite.

Bedrooms are measured at wing level, not individually. Bathrooms, the seclusion
suite, the family visits room, the consultation and treatment rooms and the
support wing carry no sensors. An area with no sensor is never shown as being
within its level.

### Channels

Each area carries a reading and a set level on three channels:

| Channel | Measure | Also recorded |
|---|---|---|
| Sound | dB LAeq over the last minute | Peak levels, rate of change |
| Foot traffic | Passes a minute through the area | People present, split into patients and staff |
| Light | Lux at seated height | The share that is daylight rather than artificial |

### Status rules

A single three-step scale is used on every channel, so a colour always means the
same thing and only the measurement being judged changes:

- **Within** — the reading is below 85% of the set level.
- **Approaching** — the reading is at or above 85% of the set level.
- **Above** — the reading is over the set level.

An area's combined status is the worst status across its three channels. Foot
traffic takes the worse of passes a minute and people present.

### Two kinds of threshold

This distinction is the point of the application and should survive into any
real build.

**Set levels** belong to the area. They are set by the ward's occupational
therapist or the ward manager, reviewed monthly, and listed in full on
`patterns.html`. They drive the alerts.

**Individual limits** belong to the patient. Each profile records a comfortable
band and a hard limit per channel, together with recorded triggers and the
adjustments agreed in the care plan. `patient.html` compares those limits with
the reading in the area the patient is actually in, which is how a reading
becomes a decision.

An area can be within its set level while still being over a particular
patient's limit. The reverse also happens. Both cases are shown.

Light is judged on the daylight and artificial split as well as the total. A
patient whose profile flags artificial light above 400 lux can be over their
limit in a room that is comfortably within its own set level.

### People

Occupancy is split into patients and staff. Set levels count everyone in the
room, on the grounds that sensory load comes from all bodies present. The split
is shown so staff can see what is actually driving a crowding alert.

## How it is built

The screens were designed on a canvas whose artboards use three template
primitives: `{{dotted.path}}` holes, `<sc-for list as>` repeats and
`<sc-if value>` branches, fed by a `renderVals()` method on a `Component` class.

- `source/*.dc.html` — the artboards as authored, plus `canvas.json`.
- `dc-lite.js` — a dependency-free reimplementation of those three primitives,
  about 150 lines, so the same markup runs as an ordinary web page.
- `build.py` — unwraps each artboard into a standalone page: lifts the
  `<helmet>` CSS into `<head>`, rewrites `onClick` to `data-on-click` so the
  browser does not try to parse a template hole as script, points the plan image
  and the cross-screen links at repository files, and writes the result.

To rebuild after changing anything in `source/`:

```
python3 build.py
```

`ward-plan.png` is the ward layout the overlay is drawn on. Status tints, reading
pills and sensor markers are positioned as percentages of the image, so they
scale with it. Replacing the plan means revisiting those percentages in
`source/Main.dc.html`.

## What a real build would need

The prototype deliberately stops short of the following.

- Sensor ingestion, time-series storage and a retention policy. The screens
  assume a 30-second refresh, 90 days at full detail and hourly averages after
  that.
- Authentication, and restriction of a patient's location history to the
  clinical team caring for them.
- Telling patients from staff. The prototype assumes staff badge readers at each
  sensor rather than any identification of individuals.
- Alert escalation. There is currently no behaviour for an alert that is never
  acknowledged.
- Whether a staff-recorded response can adjust a patient's limits automatically.
  The prototype assumes limits change only at review.

## Design notes

The interface is deliberately low-arousal: a soft neutral ground, restrained
colour, and no motion. An application about sensory load should not add to it.

Colours that must be told apart differ in lightness as well as hue, and no
status is carried by colour alone — every tint, pill and bar is accompanied by a
word or a number.

Sound sensors measure sound pressure only and hold no audio. Foot-traffic
sensors count people crossing a line and hold no images. These limits are stated
on the screens themselves, because a ward will reasonably ask.
