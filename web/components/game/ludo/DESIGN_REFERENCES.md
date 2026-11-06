# Ludo Game Design References

This document contains design references for all Ludo game screens and features.

## Board Path & Safe Stars
- Description: The game board with the path players follow and safe squares (stars) where pieces cannot be captured.
- Visual elements: 
  - Track layout (column-based path starting from each corner)
  - Safe stars (colored markers on the path)
  - Starting zones for each player
  - Home column entrance

## Profile Cards & Dice Slot
- Description: Player profile cards and the dice rolling interface.
- Visual elements:
  - Player avatar/profile image
  - Player name display
  - Dice slot/area with animated dice
  - Turn indicator

## Stake Selection Modal
- Description: Modal dialog for selecting the bet/stake amount before starting a game.
- Visual elements:
  - Stake amount options (e.g., 10, 50, 100, 500)
  - Currency display
  - Confirm/Cancel buttons
  - Risk/reward indicators

## Additional Sections
- Game Rules: Official Ludo rules and special variations used
- Color Scheme: Primary colors for each player (green, yellow, red, blue)
- Piece Movement: Animation frames and movement logic
- Sound Effects: Dice roll, piece capture, game start/end sounds
- Mobile Responsive: Touch target sizes and mobile layout adjustments

## Reference Screens
The following 9 reference screens define the Ludo game visual flow. Place corresponding PNG files in `src/assets/references/ludo/`:

| Number | File Name | Description |
|--------|-----------|-------------|
| 01 | `splash-screen.png` | Initial game splash/loading screen with brand logo |
| 02 | `home-screen.png` | Main home screen showing game options and play buttons |
| 03 | `game-mode.png` | Game mode selection (Classic, Aero, etc.) |
| 04 | `player-selection.png` | Player count and token color selection |
| 05 | `play-type.png` | Play type selection (online, offline, vs AI) |
| 06 | `staking-screen.png` | Stake/betting amount selection modal |
| 07 | `classic-gameplay.png` | Classic Ludo gameplay board in action |
| 08 | `aero-gameplay.png` | Aero-themed Ludo gameplay variant |
| 09 | `results-screen.png` | Game results screen showing winner and stats |