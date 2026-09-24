# XR Iteration Gallery — hand interaction prompt

Implement the following hand interactions for the XR Iteration Gallery. Reuse the web gallery's data model: a **version block** contains a chronological sequence of saved **frames**, with its push frame closing that version. Keep gesture thresholds, animation settings, and placement distances configurable.

## 1. Point or touch to select a version

When the user points at or touches a version block, lift that block above the album and display its first frame. Follow the supplied layout reference for the lifted arrangement and text placement.

Display the current frame's capture date at the top left and its version number, formatted as `v#`, at the bottom right. Use the version's push/commit message as the heading and the current frame's prompt summary as the body. For a push frame, show its push message without inventing prompt text.

Derive this information from the existing capture metadata and filename parser. Filenames contain shortened summaries, not necessarily complete prompts; do not reconstruct missing text. If the version has no closing push yet, label its heading “Work in progress.”

Update selection as the user points at different version blocks. Return the previously selected block to its original position. Continuing to point at the same version must not reset its current frame.

## 2. Swish sideways to navigate frames

While a version is lifted, the user can browse its frames with a sideways, open-hand swishing gesture, as illustrated in the gesture references. Keep the four fingers extended and together, with the thumb relaxed. Allow natural wrist and forearm rotation during the sweep rather than requiring a fixed palm orientation.

A leftward sweep advances to the next frame within that version; a rightward sweep returns to the previous frame. Determine left and right relative to the user's viewing direction when the gesture begins.

Update the image, date, and descriptive text together. Each completed sweep advances exactly one frame. At the boundaries, retain the current frame and show “Last frame in this version” or “First frame in this version” in the instruction text in front of the user. Do not wrap or switch versions automatically.

The reference images establish the hand pose, but not an exact movement speed or trajectory. Keep recognition thresholds adjustable during XR testing.

## 3. Hold the finishing pose to browse continuously

After a sweep, holding the hand in its finishing pose continues browsing in the last recognized direction at **one frame every 0.5 seconds**. The hand does not need to keep moving.

Stop when the user relaxes the pose, changes interaction, or reaches the first or last frame. Reversing direction requires a new sweep. Use a configurable hold delay to distinguish a single sweep from continuous browsing.

## 4. Pinch to grab and place the current frame

Pinching the displayed frame grabs that individual frame and its labels. While the pinch is held, it follows the grabbing hand.

On release, use this shared placement behavior:

- If the release position is within a configurable distance of a detected wall or tabletop, place the frame flush with that surface, facing outward, with a small offset to prevent clipping.
- Otherwise, leave it anchored in midair at the release position, facing the user. Allow a limited upward or downward tilt based on the headset's position at release.

Stop automatic browsing while grabbing. The placed frame retains the exact image and metadata that were visible when it was grabbed.

## 5. Close a fist to pocket; open the palm to retrieve

With a version selected, closing a fist directly over its displayed frame pockets that specific frame. Preserve its version, frame index, image, and metadata while hiding it from view.

The user can then move elsewhere and open the same hand to retrieve it. Place the retrieved frame near the palm using the same surface-or-midair placement rules as pinch release.

Keep one pocketed frame per hand. Opening a hand with no pocketed frame does nothing.

## Interaction coordination

Suspend pointer-based version switching during swishing, continuous browsing, grabbing, or pocketing. Require a gesture to end before recognizing it again, except for the explicitly defined hold-to-browse behavior. Keep the open-hand swish distinct from the closed-fist pocket gesture and the thumb–finger pinch.

## Gesture references

- [Open-hand pose](../visual_ref/%5Bprompt%20%23152%5D%20codex-clipboard-8622953b-56de-4955-9369-64727bfc856f.png)
- [Turned-hand pose](../visual_ref/%5Bprompt%20%23152%5D%20codex-clipboard-ea5c305b-1c86-4fce-9442-36271112ca9c.png)
