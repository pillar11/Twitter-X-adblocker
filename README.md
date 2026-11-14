# X Promoted Blocker

A small Chrome extension that hides promoted posts (ads) on X (Twitter). It removes posts marked **Ad**, **Promoted**, **Boosted** or **Ad from <website>**, promoted trends, and promoted "who to follow" entries, and it closes the gap they would leave in your feed.

## Features

- Hides promoted posts in the timeline, replies, search and profiles.
- Recognizes the labels X uses today: `Ad`, `Promoted`, `Boosted`, `Ad from <website>`, plus translations in French, German, Spanish, Portuguese, Italian, Arabic, Turkish, Dutch and Swedish.
- Hides promoted trends and promoted "who to follow" entries.
- Collapses a hidden ad to a 1px row so X's feed closes the empty space instead of leaving a hole.
- Mutes and pauses any video inside a hidden ad.
- Leaves normal posts alone: a post whose own text says "Ad", or a person named "Ad", is not hidden.
- A popup with an on/off switch and a counter of hidden items.
- Works on `x.com` and `twitter.com`. Nothing leaves your browser.

## Install

The extension is not on the Chrome Web Store, so load it manually:

1. Download or clone this repository and keep the folder somewhere permanent.
2. Open `chrome://extensions` in Chrome (or any Chromium browser such as Edge or Brave).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this folder (the one containing `manifest.json`).
5. Reload any open X tab.

If you move or delete the folder, the browser removes the extension.

## Use

It works on its own. Click the extension icon to turn it off, reset the counter, or copy debug info.

## If an ad slips through

X changes its page and ad labels from time to time. If you still see an ad:

1. Open X in the tab where you see it.
2. Click the extension icon and press **Copy debug info**.
3. Paste the result into a new issue in this repository.

The report lists the ad-like words on the page and the elements around them, plus layout details of hidden rows. It contains no account or personal information, only short text snippets found on the page.

## How it works

A content script runs on x.com and watches the page for changes. For each post (`<article>`), trend and "who to follow" entry, it looks for X's small ad label, or for links X tags as promoted trends (`promoted_trend_click`). When it finds one it marks the whole list row, and a stylesheet collapses that row to 1px. A plain `display: none` leaves a blank gap, because X's feed remembers each row's height and ignores a row that reports a height of 0.

Text written by users (post text and bios) and profile name links are skipped, so ordinary posts that happen to contain the word "Ad" are not hidden.

## Permissions

- `storage`: to save the on/off setting and the hidden-items counter.
- Access to `https://x.com/*` and `https://twitter.com/*`: to run on those sites only.

No data is collected or sent anywhere.

## Limitations

- It finds ads by their visible label. An ad that carries no label cannot be detected.
- If X changes its page structure or label wording, the extension may need an update (see "If an ad slips through").
- It was tested in Chrome on a desktop layout of x.com. Other layouts may differ.
- The label word lists for languages other than English are best-effort.

## Disclaimer

This project is not affiliated with or endorsed by X Corp. It only changes how pages look in your own browser.

## License

MIT. See [LICENSE](LICENSE).
