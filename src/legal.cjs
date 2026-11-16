// Texte für Impressum, Datenschutzerklärung und die Fehlerseite (DE verbindlich, EN als Übersetzung).
// Absätze sind HTML: Links und Hervorhebungen stehen direkt im Text. Woher die Angaben stammen, steht in docs/QUELLEN.md.
const ADDRESS = 'Jason Thomas Wolf<br>Darmstädter Landstraße 62<br>60598 Frankfurt am Main<br>';
const MAIL = '<a href="mailto:jason@jasonwolf.de">jason@jasonwolf.de</a>';
const TEL = '<a href="tel:+4915251530075">+49 152 51530075</a>';
const ext = (url, label) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label || url}</a>`;

const impressum = {
  de: {
    title: 'Impressum',
    metaDesc: 'Impressum von Jason Thomas Wolf, Frankfurt am Main: Anbieter, Kontakt, Verantwortlicher für die Inhalte und rechtliche Hinweise.',
    updated: 'Stand: November 2026',
    sections: [
      { h: 'Angaben gemäß § 5 DDG', ps: [`<address>${ADDRESS}Deutschland</address>`,
        'Diese Website ist ein privates Angebot. Ich biete hier keine Waren oder Dienstleistungen gegen Entgelt an.'] },
      { h: 'Kontakt', ps: [`Telefon: ${TEL}<br>E-Mail: ${MAIL}`] },
      { h: 'Verantwortlich für die Inhalte', ps: [
        'Verantwortlich für journalistisch-redaktionelle Inhalte dieser Website, insbesondere die Artikel im Blog, ist gemäß § 18 Abs. 2 MStV:',
        `<address>${ADDRESS}Deutschland</address>`] },
      { h: 'Verbraucherstreitbeilegung', ps: [
        'Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).',
        'Die frühere Plattform der Europäischen Kommission zur Online-Streitbeilegung wurde zum 20. Juli 2025 eingestellt. Ein Verweis darauf entfällt deshalb.'] },
      { h: 'Persönliche Inhalte, kein Bezug zum Arbeitgeber', ps: [
        'Diese Website und der Blog sind privat. Alle Inhalte geben ausschließlich meine persönliche Sicht wieder. Sie stehen in keinem Zusammenhang mit meinem Arbeitgeber oder meiner Hochschule und sind mit diesen nicht abgestimmt.',
        'Genannte Unternehmens-, Produkt- und Markennamen gehören ihren jeweiligen Inhabern. Die Nennung dient nur der Beschreibung meines Werdegangs und meiner Nachweise.'] },
      { h: 'Keine Anlage-, Rechts- oder Steuerberatung', ps: [
        'Beiträge und Projekte zu Finanzthemen, zum Beispiel Unternehmensbewertungen oder Auswertungen von Marktdaten, dienen der Information und der eigenen Übung. Sie sind keine Anlageberatung, keine Anlageempfehlung und keine Aufforderung zum Kauf oder Verkauf von Wertpapieren. Ebenso wenig ersetzen Inhalte dieser Website eine Rechts- oder Steuerberatung.'] },
      { h: 'Haftung für Inhalte', ps: [
        'Für eigene Inhalte auf diesen Seiten bin ich nach § 7 Abs. 1 DDG nach den allgemeinen Gesetzen verantwortlich. Ich erstelle die Inhalte mit Sorgfalt, kann aber keine Gewähr dafür übernehmen, dass sie vollständig, richtig und jederzeit aktuell sind.',
        'Eine allgemeine Pflicht, fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen, besteht nicht (Art. 8 der Verordnung (EU) 2022/2065, Digital Services Act). Werden mir Rechtsverletzungen bekannt, entferne ich die betroffenen Inhalte umgehend.'] },
      { h: 'Haftung für Links', ps: [
        'Diese Website enthält Links zu Websites Dritter, zum Beispiel zu GitHub, LinkedIn, Credly und Forage. Auf deren Inhalte habe ich keinen Einfluss. Für die Inhalte der verlinkten Seiten ist der jeweilige Anbieter verantwortlich. Beim Setzen der Links waren keine rechtswidrigen Inhalte erkennbar. Werden mir Rechtsverletzungen bekannt, entferne ich die betroffenen Links umgehend.'] },
      { h: 'Urheberrecht', ps: [
        'Texte, Gestaltung, Grafiken und das Portraitfoto auf dieser Website sind urheberrechtlich geschützt. Jede Verwertung außerhalb der Grenzen des Urheberrechts, etwa das Vervielfältigen, Bearbeiten oder Verbreiten, braucht meine vorherige Zustimmung. Das Zitieren mit Quellenangabe und Link im gesetzlich erlaubten Rahmen ist willkommen.',
        `Der Quelltext meiner Projekte steht auf ${ext('https://github.com/Jaywolfy', 'GitHub')}. Dort gilt die Lizenz, die im jeweiligen Repository angegeben ist.`,
        'Inhalte Dritter sind als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitte ich um einen Hinweis. Ich entferne solche Inhalte umgehend.'] }
    ]
  },
  en: {
    title: 'Legal notice',
    metaDesc: 'Legal notice of Jason Thomas Wolf, Frankfurt am Main, Germany: provider, contact, person responsible for content and legal information.',
    updated: 'Last updated: November 2026',
    note: 'This is a courtesy translation. Only the <a href="/impressum.html" hreflang="de">German version</a> of this legal notice is legally binding.',
    sections: [
      { h: 'Information pursuant to Section 5 DDG (German Digital Services Act)', ps: [`<address>${ADDRESS}Germany</address>`,
        'This website is a private offering. I do not offer goods or services for payment here.'] },
      { h: 'Contact', ps: [`Phone: ${TEL}<br>Email: ${MAIL}`] },
      { h: 'Responsible for content', ps: [
        'Responsible for journalistic and editorial content on this website, in particular the blog articles, pursuant to Section 18 (2) MStV (German State Media Treaty):',
        `<address>${ADDRESS}Germany</address>`] },
      { h: 'Consumer dispute resolution', ps: [
        'I am neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board (Section 36 VSBG).',
        'The European Commission’s former online dispute resolution platform was discontinued on 20 July 2025, so there is no longer a reference to it.'] },
      { h: 'Personal content, no connection to my employer', ps: [
        'This website and the blog are private. All content reflects my personal view only. It is not connected to or coordinated with my employer or my university.',
        'Company, product and brand names mentioned belong to their respective owners. They are named only to describe my career and credentials.'] },
      { h: 'No investment, legal or tax advice', ps: [
        'Articles and projects on financial topics, such as company valuations or market data analyses, are for information and my own practice. They are not investment advice, not a recommendation and not a solicitation to buy or sell securities. Nor does any content on this website replace legal or tax advice.'] },
      { h: 'Liability for content', ps: [
        'I am responsible for my own content on these pages under general law pursuant to Section 7 (1) DDG. I prepare the content with care but cannot guarantee that it is complete, correct and up to date at all times.',
        'There is no general obligation to monitor third-party information or to actively look for circumstances indicating illegal activity (Article 8 of Regulation (EU) 2022/2065, Digital Services Act). If I become aware of an infringement, I will remove the content concerned without delay.'] },
      { h: 'Liability for links', ps: [
        'This website links to third-party websites such as GitHub, LinkedIn, Credly and Forage. I have no control over their content. The respective provider is responsible for the content of linked pages. No illegal content was apparent when the links were created. If I become aware of an infringement, I will remove the links concerned without delay.'] },
      { h: 'Copyright', ps: [
        'Texts, design, graphics and the portrait photo on this website are protected by copyright. Any use beyond the limits of copyright law, such as copying, editing or distributing, requires my prior consent. Quoting with attribution and a link within the legally permitted scope is welcome.',
        `The source code of my projects is on ${ext('https://github.com/Jaywolfy', 'GitHub')}. The license stated in each repository applies there.`,
        'Third-party content is marked as such. If you nevertheless notice a copyright infringement, please let me know and I will remove the content without delay.'] }
    ]
  }
};

const privacy = {
  de: {
    title: 'Datenschutzerklärung',
    metaDesc: 'Datenschutzerklärung von jasonwolf.de: Hosting, Server-Protokolle, Kontaktformular, Google Analytics nur mit Einwilligung, Blog und Ihre Rechte nach der DSGVO.',
    updated: 'Stand: November 2026',
    sections: [
      { h: '1. Das Wichtigste in Kürze', ps: [
        'Diese Website lässt sich ohne Angabe persönlicher Daten lesen. Schriften, Bilder und Skripte kommen von meinem eigenen Server. Beim bloßen Aufruf werden keine Dienste Dritter eingebunden und keine Cookies gesetzt.',
        'Daten an Dritte fließen nur in zwei Fällen, und nur, wenn Sie es ausdrücklich wollen: wenn Sie das Kontaktformular absenden (Formspree) und wenn Sie der Statistik zustimmen (Google Analytics).'] },
      { h: '2. Verantwortlicher', ps: [
        `Verantwortlich für die Datenverarbeitung auf dieser Website im Sinne von Art. 4 Nr. 7 DSGVO ist:`,
        `<address>${ADDRESS}Deutschland</address>`,
        `Telefon: ${TEL}<br>E-Mail: ${MAIL}`,
        'Ein Datenschutzbeauftragter ist nicht bestellt, weil dafür keine gesetzliche Pflicht besteht.'] },
      { h: '3. Hosting und Server-Protokolle', ps: [
        'Die Website läuft auf einem virtuellen Server, den ich selbst verwalte. Der Server steht in einem Rechenzentrum der IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, in Deutschland. IONOS stellt die Infrastruktur als Auftragsverarbeiter bereit (Art. 28 DSGVO).',
        'Bei jedem Aufruf übermittelt Ihr Browser technisch notwendige Daten, die der Server in einem Zugriffsprotokoll speichert: IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Statuscode, übertragene Datenmenge, die zuvor besuchte Seite (Referrer) sowie Browser und Betriebssystem (User-Agent).',
        'Ich nutze diese Daten nur, um die Website auszuliefern, Fehler zu finden und Angriffe abzuwehren. Rechtsgrundlage ist mein berechtigtes Interesse an einem sicheren und stabilen Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Die Protokolle werden wöchentlich rotiert und nach spätestens fünf Wochen automatisch gelöscht. Ich führe sie nicht mit anderen Daten zusammen.'] },
      { h: '4. Cookies und lokaler Speicher', ps: [
        'Ohne Ihre Zustimmung setzt diese Website keine Cookies.',
        'Ihre Entscheidung im Hinweis zur Statistik („Akzeptieren“ oder „Ablehnen“) wird im lokalen Speicher Ihres Browsers unter dem Namen <code>jw-cookie-consent</code> abgelegt, damit der Hinweis nicht bei jedem Besuch wieder erscheint. Dieser Eintrag enthält keine Kennung, wird nicht an mich übertragen und ist technisch erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Sie können ihn jederzeit über die Einstellungen Ihres Browsers löschen.',
        'Wenn Sie über den Schalter „DE / EN“ die Sprache wechseln, wird Ihre Wahl unter dem Namen <code>jw-lang</code> ebenfalls im lokalen Speicher abgelegt, damit die Website beim nächsten Besuch in dieser Sprache erscheint. Ohne eine solche Wahl richtet sich die Sprache nach der Spracheinstellung Ihres Browsers. Auch dieser Eintrag bleibt auf Ihrem Gerät und ist für die von Ihnen gewünschte Funktion erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).',
        'Cookies von Google Analytics werden erst nach Ihrer Einwilligung gesetzt. Einzelheiten stehen in Abschnitt 7.'] },
      { h: '5. Kontaktformular (Formspree)', ps: [
        'Wenn Sie das Kontaktformular absenden, verarbeite ich Ihren Namen, Ihre E-Mail-Adresse und Ihre Nachricht, um Ihre Anfrage zu beantworten.',
        `Für den Versand nutze ich den Dienst Formspree der Formspree, Inc., USA. Ihre Angaben werden beim Absenden direkt an Server von Formspree übertragen, dort gespeichert und per E-Mail an mich weitergeleitet. Dabei erhält Formspree auch Ihre IP-Adresse. Die Datenschutzerklärung von Formspree finden Sie unter ${ext('https://formspree.io/legal/privacy-policy')}.`,
        'Rechtsgrundlage ist Ihre Einwilligung, die Sie mit dem Ankreuzfeld im Formular erteilen (Art. 6 Abs. 1 lit. a DSGVO). Die Einwilligung umfasst ausdrücklich die Übermittlung in die USA (Art. 49 Abs. 1 lit. a DSGVO). Für diese Übermittlung liegt mir keine Bestätigung über ein Schutzniveau vor, das dem der EU entspricht. Es besteht das Risiko, dass US-Behörden auf die Daten zugreifen und Sie Ihre Rechte dort schwerer durchsetzen können.',
        `Wenn Sie das nicht möchten, schreiben Sie mir bitte direkt an ${MAIL}. Ihre Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Ich lösche Ihre Nachricht bei mir und bei Formspree, sobald Ihr Anliegen erledigt ist und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.`] },
      { h: '6. Kontakt per E-Mail oder Telefon', ps: [
        'Wenn Sie mir eine E-Mail schreiben oder mich anrufen, verarbeite ich die Angaben, die Sie mir dabei mitteilen, um Ihr Anliegen zu bearbeiten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, wenn es um einen Vertrag oder dessen Anbahnung geht, sonst mein berechtigtes Interesse an der Beantwortung von Anfragen (Art. 6 Abs. 1 lit. f DSGVO).',
        'Mein E-Mail-Postfach liegt bei der IONOS SE in Deutschland. Ich lösche die Kommunikation, sobald sie nicht mehr gebraucht wird und keine gesetzlichen Aufbewahrungspflichten bestehen.'] },
      { h: '7. Statistik mit Google Analytics', ps: [
        'Mit Ihrer Einwilligung nutzt diese Website Google Analytics 4, einen Analysedienst der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Ich möchte damit verstehen, welche Seiten und Artikel gelesen werden und wie Besucher die Website finden.',
        'Google Analytics wird erst geladen, nachdem Sie im Hinweis auf „Akzeptieren“ geklickt haben. Ohne Ihre Zustimmung wird keine Verbindung zu Google aufgebaut. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO und § 25 Abs. 1 TDDDG).',
        'Erfasst werden unter anderem aufgerufene Seiten, Verweildauer, Klicks auf Links und Downloads, die ungefähre Herkunft (Land, Region, Stadt), Angaben zu Gerät und Browser sowie die Seite, von der Sie gekommen sind. Dafür setzt Google Analytics die Cookies <code>_ga</code> (unterscheidet Besucher) und <code>_ga_THRPTND065</code> (speichert den Sitzungsstatus), jeweils mit einer Laufzeit von zwei Jahren. Ihre IP-Adresse wird von Google Analytics 4 nach Angaben von Google nicht protokolliert oder gespeichert.',
        'Google Signals und personalisierte Werbung sind ausgeschaltet. Die Daten werden nicht für Werbung genutzt. Nutzerbezogene Daten werden bei Google nach spätestens 14 Monaten gelöscht.',
        'Google kann die Daten auch in den USA verarbeiten. Die Google LLC ist nach dem EU-US Data Privacy Framework zertifiziert. Dafür besteht ein Angemessenheitsbeschluss der Europäischen Kommission vom 10. Juli 2023 (Art. 45 DSGVO). Mit Google besteht ein Vertrag zur Auftragsverarbeitung.',
        `Sie können Ihre Einwilligung jederzeit widerrufen: über „Cookie-Einstellungen“ am Ende jeder Seite und dort mit „Ablehnen“. Die Cookies von Google Analytics werden dann gelöscht. Zusätzlich bietet Google ein Browser-Add-on zum Deaktivieren an: ${ext('https://tools.google.com/dlpage/gaoptout')}. Mehr zum Umgang von Google mit Daten: ${ext('https://policies.google.com/privacy')}.`] },
      { h: '8. Blog', ps: [
        'Der Blog hat keine Kommentarfunktion, keinen Newsletter und keine Benutzerkonten für Leser. Bilder und Videos in den Artikeln liegen auf meinem Server. Es werden keine Inhalte von Videoplattformen oder sozialen Netzwerken eingebettet.',
        'Um zu sehen, welche Artikel gelesen werden, zählt der Blog die Aufrufe je Artikel und Tag. Gespeichert wird nur die Zahl. Es werden dafür keine IP-Adressen, Cookies oder Kennungen verwendet, ein Rückschluss auf einzelne Personen ist nicht möglich.',
        'Die Feeds unter <a href="/blog/feed.xml">/blog/feed.xml</a> (Deutsch) und <a href="/en/blog/feed.xml">/en/blog/feed.xml</a> (Englisch) lassen sich mit einem Feedreader abonnieren. Dabei fallen nur die Server-Protokolle aus Abschnitt 3 an.'] },
      { h: '9. Schriften', ps: [
        'Die Schriften Source Serif 4, Instrument Sans und JetBrains Mono werden von meinem eigenen Server geladen. Es besteht keine Verbindung zu Google Fonts oder anderen Schriftanbietern.'] },
      { h: '10. Links zu anderen Websites', ps: [
        'Diese Website verlinkt unter anderem auf GitHub, LinkedIn, Credly und Forage. Es handelt sich um einfache Links, nicht um eingebettete Inhalte. Daten werden erst übertragen, wenn Sie einen Link anklicken. Dann gilt die Datenschutzerklärung des jeweiligen Anbieters.'] },
      { h: '11. Ihre Rechte', ps: [
        'Sie haben mir gegenüber folgende Rechte hinsichtlich Ihrer personenbezogenen Daten: Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO), Einschränkung der Verarbeitung (Art. 18 DSGVO) und Datenübertragbarkeit (Art. 20 DSGVO).',
        '<strong>Widerspruch:</strong> Soweit ich Daten auf Grundlage eines berechtigten Interesses verarbeite (Art. 6 Abs. 1 lit. f DSGVO), können Sie dem aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit widersprechen (Art. 21 DSGVO).',
        '<strong>Widerruf:</strong> Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3 DSGVO). Die Verarbeitung bis zum Widerruf bleibt rechtmäßig.',
        `Für all das genügt eine formlose Nachricht an ${MAIL}.`,
        `Außerdem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO). Für mich zuständig ist: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Gustav-Stresemann-Ring 1, 65189 Wiesbaden, ${ext('https://datenschutz.hessen.de')}.`] },
      { h: '12. Pflicht zur Bereitstellung, automatisierte Entscheidungen', ps: [
        'Sie sind nicht verpflichtet, mir personenbezogene Daten bereitzustellen. Ohne die Angaben im Kontaktformular kann ich Ihre Anfrage allerdings nicht beantworten. Eine automatisierte Entscheidungsfindung einschließlich Profiling (Art. 22 DSGVO) findet nicht statt.'] },
      { h: '13. Sicherheit', ps: [
        'Die Website wird ausschließlich verschlüsselt über HTTPS (TLS) ausgeliefert. Sie erkennen das am Schloss-Symbol und an „https://“ in der Adresszeile Ihres Browsers.'] },
      { h: '14. Änderungen', ps: [
        'Ich passe diese Datenschutzerklärung an, wenn sich die Website oder die Rechtslage ändert. Es gilt die jeweils hier veröffentlichte Fassung.'] }
    ]
  },
  en: {
    title: 'Privacy policy',
    metaDesc: 'Privacy policy of jasonwolf.de: hosting, server logs, contact form, Google Analytics only with consent, blog and your rights under the GDPR.',
    updated: 'Last updated: November 2026',
    note: 'This is a courtesy translation. Only the <a href="/datenschutz.html" hreflang="de">German version</a> of this privacy policy is legally binding.',
    sections: [
      { h: '1. The essentials', ps: [
        'You can read this website without providing any personal data. Fonts, images and scripts come from my own server. Simply opening a page does not load third-party services and does not set cookies.',
        'Data goes to third parties in two cases only, and only if you explicitly choose so: when you submit the contact form (Formspree) and when you agree to statistics (Google Analytics).'] },
      { h: '2. Controller', ps: [
        'The controller for data processing on this website within the meaning of Art. 4 (7) GDPR is:',
        `<address>${ADDRESS}Germany</address>`,
        `Phone: ${TEL}<br>Email: ${MAIL}`,
        'No data protection officer has been appointed because there is no legal obligation to do so.'] },
      { h: '3. Hosting and server logs', ps: [
        'The website runs on a virtual server that I administer myself. The server is located in a data centre of IONOS SE, Elgendorfer Str. 57, 56410 Montabaur, in Germany. IONOS provides the infrastructure as a processor (Art. 28 GDPR).',
        'With every request your browser transmits technically necessary data, which the server stores in an access log: IP address, date and time, requested address, status code, amount of data transferred, the page visited before (referrer), and browser and operating system (user agent).',
        'I use this data only to deliver the website, find errors and defend against attacks. The legal basis is my legitimate interest in secure and stable operation (Art. 6 (1) (f) GDPR). The logs are rotated weekly and deleted automatically after five weeks at the latest. I do not combine them with other data.'] },
      { h: '4. Cookies and local storage', ps: [
        'Without your consent this website does not set any cookies.',
        'Your choice in the statistics notice (“Accept” or “Decline”) is stored in your browser’s local storage under the name <code>jw-cookie-consent</code> so that the notice does not reappear on every visit. This entry contains no identifier, is not transmitted to me and is technically necessary (Section 25 (2) no. 2 TDDDG). You can delete it at any time in your browser settings.',
        'When you switch the language via the “DE / EN” toggle, your choice is also stored in local storage under the name <code>jw-lang</code> so that the website appears in that language on your next visit. Without such a choice, the language follows your browser’s language setting. This entry also stays on your device and is necessary for the function you requested (Section 25 (2) no. 2 TDDDG).',
        'Google Analytics cookies are only set after you consent. Details are in section 7.'] },
      { h: '5. Contact form (Formspree)', ps: [
        'When you submit the contact form, I process your name, email address and message in order to answer your inquiry.',
        `The form is delivered by Formspree, a service of Formspree, Inc., USA. On submission your details are sent directly to Formspree’s servers, stored there and forwarded to me by email. Formspree also receives your IP address. Formspree’s privacy policy: ${ext('https://formspree.io/legal/privacy-policy')}.`,
        'The legal basis is your consent, given via the checkbox in the form (Art. 6 (1) (a) GDPR). Your consent explicitly covers the transfer to the USA (Art. 49 (1) (a) GDPR). I have no confirmation of a level of protection for this transfer that is equivalent to that of the EU. There is a risk that US authorities may access the data and that your rights may be harder to enforce there.',
        `If you do not want that, please write to me directly at ${MAIL}. You can withdraw your consent at any time with effect for the future. I delete your message on my side and at Formspree once your request has been dealt with and no statutory retention obligations apply.`] },
      { h: '6. Contact by email or phone', ps: [
        'If you email or call me, I process the information you give me in order to handle your request. The legal basis is Art. 6 (1) (b) GDPR where a contract or its preparation is concerned, otherwise my legitimate interest in answering inquiries (Art. 6 (1) (f) GDPR).',
        'My mailbox is hosted by IONOS SE in Germany. I delete the communication once it is no longer needed and no statutory retention obligations apply.'] },
      { h: '7. Statistics with Google Analytics', ps: [
        'With your consent this website uses Google Analytics 4, an analytics service of Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland. I use it to understand which pages and articles are read and how visitors find the website.',
        'Google Analytics is only loaded after you click “Accept” in the notice. Without your consent no connection to Google is established. The legal basis is your consent (Art. 6 (1) (a) GDPR and Section 25 (1) TDDDG).',
        'Data collected includes pages viewed, time spent, clicks on links and downloads, approximate origin (country, region, city), device and browser details and the page you came from. For this, Google Analytics sets the cookies <code>_ga</code> (distinguishes visitors) and <code>_ga_THRPTND065</code> (stores session state), each with a lifetime of two years. According to Google, Google Analytics 4 does not log or store your IP address.',
        'Google Signals and personalised advertising are switched off. The data is not used for advertising. User-level data is deleted at Google after 14 months at the latest.',
        'Google may also process the data in the USA. Google LLC is certified under the EU-US Data Privacy Framework, for which the European Commission adopted an adequacy decision on 10 July 2023 (Art. 45 GDPR). A data processing agreement is in place with Google.',
        `You can withdraw your consent at any time via “Cookie settings” at the bottom of every page by choosing “Decline”. The Google Analytics cookies are then deleted. Google also offers a browser add-on to opt out: ${ext('https://tools.google.com/dlpage/gaoptout')}. More on how Google handles data: ${ext('https://policies.google.com/privacy')}.`] },
      { h: '8. Blog', ps: [
        'The blog has no comment function, no newsletter and no reader accounts. Images and videos in articles are hosted on my server. No content from video platforms or social networks is embedded.',
        'To see which articles are read, the blog counts views per article and day. Only the number is stored. No IP addresses, cookies or identifiers are used for this, and no conclusions about individuals are possible.',
        'The feeds at <a href="/blog/feed.xml">/blog/feed.xml</a> (German) and <a href="/en/blog/feed.xml">/en/blog/feed.xml</a> (English) can be subscribed to with a feed reader. Only the server logs described in section 3 are created in the process.'] },
      { h: '9. Fonts', ps: [
        'The fonts Source Serif 4, Instrument Sans and JetBrains Mono are loaded from my own server. There is no connection to Google Fonts or other font providers.'] },
      { h: '10. Links to other websites', ps: [
        'This website links to GitHub, LinkedIn, Credly and Forage, among others. These are plain links, not embedded content. Data is only transmitted when you click a link. The privacy policy of the respective provider then applies.'] },
      { h: '11. Your rights', ps: [
        'You have the following rights regarding your personal data: access (Art. 15 GDPR), rectification (Art. 16 GDPR), erasure (Art. 17 GDPR), restriction of processing (Art. 18 GDPR) and data portability (Art. 20 GDPR).',
        '<strong>Objection:</strong> Where I process data on the basis of a legitimate interest (Art. 6 (1) (f) GDPR), you may object at any time on grounds relating to your particular situation (Art. 21 GDPR).',
        '<strong>Withdrawal:</strong> You may withdraw consent at any time with effect for the future (Art. 7 (3) GDPR). Processing up to the withdrawal remains lawful.',
        `An informal message to ${MAIL} is sufficient for any of this.`,
        `You also have the right to lodge a complaint with a data protection supervisory authority (Art. 77 GDPR). The authority responsible for me is: Der Hessische Beauftragte für Datenschutz und Informationsfreiheit, Gustav-Stresemann-Ring 1, 65189 Wiesbaden, Germany, ${ext('https://datenschutz.hessen.de')}.`] },
      { h: '12. Obligation to provide data, automated decisions', ps: [
        'You are not obliged to provide me with personal data. Without the details in the contact form, however, I cannot answer your inquiry. No automated decision-making including profiling (Art. 22 GDPR) takes place.'] },
      { h: '13. Security', ps: [
        'The website is delivered exclusively in encrypted form via HTTPS (TLS). You can recognise this by the lock symbol and “https://” in your browser’s address bar.'] },
      { h: '14. Changes', ps: [
        'I update this privacy policy when the website or the legal situation changes. The version published here applies.'] }
    ]
  }
};

module.exports = { impressum, privacy };
