import { issuesUrl } from "./links.js";
import { NewTabLink } from "./new-tab-link.js";

export const AccessibilityStatement = () => (
  <>
    <p className="policy-updated">Last reviewed: November 2026</p>

    <p>
      <strong>Conformance status:</strong> Wizzaroo is built to meet the Web
      Content Accessibility Guidelines (WCAG) 2.2 at <strong>Level AA</strong>.
    </p>

    <h3>What we have done</h3>
    <ul>
      <li>
        <strong>Keyboard access</strong>: every button, form, dialog and Mission
        works with a keyboard alone, with a clear focus outline that is never
        hidden behind the footer. When a screen changes, focus moves to its
        heading or message instead of being lost.
      </li>
      <li>
        <strong>The 3D scenes</strong>: everything you can do in them can also
        be done with buttons. The World Map has a button for each Region and
        buttons to zoom and see the whole map, so it never needs dragging, and
        every bubble or letter in a Mission is a real button. Exploring an
        Island or playing in a Room works with the arrow keys or WASD, an
        on-screen joystick, or a mouse click where to go, and has buttons for
        jumping, the camera views and everything nearby.
      </li>
      <li>
        <strong>Puzzles and Checks</strong>: the Brainwave Big Top&apos;s
        puzzles and the Challenge Arena&apos;s Checks are drawn as web pages
        over the scene, not inside it, so they work with a keyboard, a screen
        reader or touch, and Checks have their own number pad.
      </li>
      <li>
        <strong>Time limits</strong>: Missions are never timed. Each Check can
        be played as Practice, with no clock, and a Parent can turn the clock
        off for a Child&apos;s Timed Checks too. Running out of time in a Check
        moves on to the next question; it is never a fail.
      </li>
      <li>
        <strong>Screen readers</strong>: every screen has its own title, one
        main heading and labelled landmarks; every control has a name, pictures
        that are only decoration are hidden, and answers, errors and saved
        changes are announced as they happen.
      </li>
      <li>
        <strong>Colour and contrast</strong>: text has at least 4.5:1 contrast
        with its background, and form fields, focus outlines and other controls
        at least 3:1. Nothing is shown by colour alone.
      </li>
      <li>
        <strong>Motion</strong>: animations are short, and when your device asks
        for reduced motion they are switched off, the 3D scenes stop bobbing and
        spinning, and the World Map&apos;s camera cuts straight to each Region.
      </li>
      <li>
        <strong>Zoom, reflow and orientation</strong>: pages reflow on narrow
        screens and when zoomed to 400%, wide tables scroll on their own, and
        the game plays in portrait or landscape.
      </li>
      <li>
        <strong>Target sizes</strong>: the game&apos;s buttons are at least 48
        by 48 pixels, and every other control at least 24 by 24.
      </li>
      <li>
        <strong>Signing in</strong>: password and code fields accept pasting and
        password managers, passkeys are supported, and no puzzle is ever asked.
        A Child opens their Character by choosing their pictures, and a Parent
        can give them new ones at any time.
      </li>
    </ul>

    <h3>Known limitations</h3>
    <ul>
      <li>
        The game needs a browser with WebGL. The 3D scene itself is hidden from
        screen readers; what is in it is read from its buttons and text.
      </li>
      <li>
        On a touch screen with no keyboard or mouse, walking freely around an
        Island needs the joystick to be dragged. Every Region and Game can still
        be opened from the World Map&apos;s buttons without walking.
      </li>
      <li>
        On a Family Device, the Parent page signs an adult out after 5 idle
        minutes, so a Child can&apos;t reach it. Nothing saved is lost; sign in
        again to carry on.
      </li>
      <li>
        Listen-and-pick Missions teach letter sounds, so they need hearing. The
        sound can be played again as often as a Child likes.
      </li>
    </ul>

    <h3>Feedback</h3>
    <p>
      If something is hard to use, please{" "}
      <NewTabLink href={issuesUrl}>open an issue on GitHub</NewTabLink> saying
      what you were trying to do, and with which browser and assistive
      technology.
    </p>
  </>
);
