export const PrivacyPolicy = () => (
  <>
    <p className="policy-updated">Last updated: November 2026</p>

    <h3>Who looks after your data</h3>
    <p>
      Wizzaroo is a learning game for primary-school Children, run by its owner
      on their own home server. The owner, as the Admin, decides what Wizzaroo
      holds and who can see it, and is responsible for it. There is no
      analytics, no tracking and no advertising, and the game loads nothing from
      other sites: its fonts, pictures and voice-over all come from
      Wizzaroo&apos;s own server.
    </p>

    <h3>Who has an account</h3>
    <p>
      Only adults have an account, and nobody can sign up: the Admin brings in
      Teachers, and the Admin and Teachers bring in Parents, each with an
      Invite. Children never have an email address or a password.
    </p>

    <h3>What Wizzaroo keeps about adults</h3>
    <ul>
      <li>
        Your name and email address, whether you have confirmed it, your role
        (Parent, Teacher or Admin), when you last signed in, and whether your
        account has been deactivated.
      </li>
      <li>
        For a Parent, their Family&apos;s name and the School that invited them;
        for a Teacher, their School and Year Groups.
      </li>
      <li>
        Your password, as a one-way hash, never the password itself; the name
        and public key of each passkey you add, and when it was last used; the
        secret for two-factor authentication when you turn it on, and its
        recovery codes as hashes.
      </li>
      <li>
        Each sign-in, by a hash of its token, and each Invite, with who made it
        and the address it was emailed to.
      </li>
      <li>
        The name of each Family Device, which Parent made it, and when it was
        last used and the IP address it was last used from. Only the last
        address is kept, and signing the device out removes it.
      </li>
    </ul>

    <h3>What Wizzaroo keeps about Children</h3>
    <ul>
      <li>
        The nickname, birth month and year (never the day), School and Phonics
        Programme a Parent, Teacher or the Admin gives each Child, and whether
        they are a year ahead of or behind their age&apos;s Year Group. Wizzaroo
        never asks for a Child&apos;s full name, birthday, photo, email address
        or location.
      </li>
      <li>
        Their Character&apos;s name and look, their Pet, Mount, Emote and Spell
        Effect, the outfits they save and the Furniture in their Room, and their
        Picture Password as a one-way hash.
      </li>
      <li>
        What each Child plays: when a Session starts and ends, which questions
        they answer, whether they were right first time and how long they took,
        how long each Activity takes, the Checks they finish and their scores,
        and the Items they buy, wear, give and put in their Room. Wizzaroo works
        out Mastery, Stars, Trophies and the Family Chest from these.
      </li>
      <li>
        What a Parent sets for each Child: their daily time, the Subjects,
        Islands, Regions and Games they can play, sound, whether Checks have a
        time limit, and whether Classmates may visit their Room. Also any
        Teacher Lock a Teacher sets, and any Stars or Family Chest coins the
        Admin gives.
      </li>
    </ul>

    <h3>Who can see a Child&apos;s details</h3>
    <ul>
      <li>
        <strong>Their Parents</strong> see and change everything about the
        Children in their own Family.
      </li>
      <li>
        <strong>Their Teachers</strong>, at the Child&apos;s School and in the
        Child&apos;s Year Group, see the Child, their Character, their progress
        and Check History, and their Family and Parents. A Teacher can turn an
        Island, Region or Game off for a Child, and change nothing else. They
        never see another School&apos;s Children, or anyone&apos;s sign-ins,
        Family Devices or Invites. A Parent&apos;s dashboard names the Teachers
        who can see each Child.
      </li>
      <li>
        <strong>The Admin</strong> can see everything, so they can run Wizzaroo.
        Each time the Admin opens a Child&apos;s progress, it is logged.
      </li>
    </ul>
    <p>
      Each Family&apos;s data is kept apart in the database itself, not only by
      the screens, so nobody reaches a Family or School that isn&apos;t theirs.
    </p>

    <h3>Classmates&apos; Rooms</h3>
    <p>
      This is off unless a Parent turns it on for their Child, and a Parent can
      turn it on only once the Child&apos;s School&apos;s data processing
      agreement with us covers it. Once it is on, Children at the same School in
      the same Year Group whose Parents have also turned it on can look at that
      Child&apos;s Room on their own Family Device: its Furniture and Trophies,
      and their Character&apos;s portrait with its Pet. They never see a name or
      anything about how the Child is learning. A Classmate&apos;s Room is
      fetched only while it is being visited and is never kept on the other
      Family&apos;s device. Nobody can see who visited, and there are no likes
      or messages; Gifts go only between siblings. Turning it off takes the Room
      away from Classmates straight away.
    </p>

    <h3>What stays on a Family Device</h3>
    <p>
      So a Child can play with no network, a Family Device keeps its
      Family&apos;s Characters, today&apos;s play time and any play not yet sent
      in its browser storage, and the game itself and its voice-over in its
      cache. Every browser also remembers the colour theme and reading voice
      chosen in Settings. The Cookie Policy lists each of them.
    </p>

    <h3>Who else sees it</h3>
    <ul>
      <li>
        <strong>Cloudflare</strong> carries every request to the home server
        through its tunnel, so it sees the addresses of the pages and the IP
        address each request comes from.
      </li>
      <li>
        <strong>Resend</strong> delivers Wizzaroo&apos;s emails: Invites, and
        confirmation, password and account emails. It sees each adult&apos;s
        email address and name, and, for an Invite, the School&apos;s name. No
        email ever holds a Child&apos;s details.
      </li>
      <li>
        <strong>The device&apos;s own speech voice</strong> reads a question or
        message out loud when someone presses Read it to me. Wizzaroo chooses a
        voice that works on the device itself where it has one; on a device with
        only an online voice, the browser&apos;s maker, such as Google, Apple or
        Microsoft, turns the words on the screen into speech.
      </li>
      <li>
        <strong>Backblaze</strong> stores an off-site copy of the nightly
        backup, in the EU, encrypted before it leaves the server, so Backblaze
        cannot read it.
      </li>
    </ul>
    <p>
      Nothing is sold, or shared with anyone else beyond the Teachers and
      Classmates&apos; Rooms described above. The server&apos;s own logs record
      each request&apos;s address and the IP address it came from.
    </p>

    <h3>How long it is kept</h3>
    <ul>
      <li>
        A Parent&apos;s sign-in lasts 30 days, and ends after 14 days unused; a
        Teacher&apos;s or the Admin&apos;s lasts 7 days, and ends after 12 hours
        unused; any ends when you sign out. On a Family Device, an adult is
        signed out after 5 idle minutes. A Family Device stays signed in until
        400 days pass with no use, or until a Parent signs it out.
      </li>
      <li>
        Links in emails stop working once used or when they run out: a password
        reset after 1 hour, an email confirmation after 24 hours and an Invite
        after 7 days.
      </li>
      <li>
        Everything else is kept until it is deleted. Deleted data stays in the
        encrypted backups until they are removed: 30 nights on the home network
        and 90 days off-site.
      </li>
    </ul>

    <h3>Your rights</h3>
    <p>
      A Parent can download everything Wizzaroo keeps about their Family from
      the <strong>Your Family&apos;s data</strong> panel, and ask there for a
      Child or the whole Family to be deleted. Once the Admin confirms,
      everything about them is deleted, including what they played. To see or
      correct anything else Wizzaroo holds about you or your Children, ask the
      Admin. Under UK data protection law you can also complain to the
      Information Commissioner&apos;s Office.
    </p>
  </>
);
