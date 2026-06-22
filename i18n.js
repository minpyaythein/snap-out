// Shared i18n dictionary + lookup. Loaded — like storage.js — in three contexts:
// the popup (via a <script> tag) and the content script (via the manifest's
// content_scripts list AND the chrome.scripting injection fallback in
// background.js). The background itself never renders text; it just reads the
// saved `language` and forwards it in the SHOW_POPUP message.
//
// Chrome's built-in chrome.i18n picks the locale from the BROWSER's UI language
// and can't be switched at runtime, so we roll a tiny dictionary instead — that
// gives us the user-facing EN/JA toggle (stored in chrome.storage.sync).
//
// Callers reference only t()/tFormat() (function declarations are shared across
// classic scripts in the same realm); the dictionary itself stays private here.
// Strings with {host}/{max} placeholders are filled by tFormat.

const I18N_DEFAULT_LANG = 'en';

const I18N_MESSAGES = {
    en: {
        // popup chrome
        subtitle:          'Track sites you want to spend less time on.',
        addPlaceholder:    'e.g. youtube.com',
        addButton:         'Add',
        emptyList:         'No sites tracked yet.',
        removeTitle:       'Remove',
        sessionNoActive:   'No active timer',
        sessionNotTracking:'Not tracking this site',
        alertAfter:        'Alert after',
        minLabel:          'min',
        secLabel:          'sec',
        unitM:             'm',
        unitS:             's',
        applyButton:       'Apply',
        mathDifficulty:    'Math difficulty',
        diffNone:          'None (just alert)',
        diffEasy:          'Easy',
        diffMedium:        'Medium',
        diffHard:          'Hard',
        diffVeryHard:      'Very Hard',
        diffSuperHard:     'Super Hard',
        diffImpossible:    'Impossible',
        languageLabel:     'Language',
        // popup errors
        errEnterSite:      'Please enter a site.',
        errInvalidSite:    'Enter a valid site, e.g. youtube.com',
        errAlreadyTracked: '{host} is already tracked.',
        errMaxSites:       'You can track up to {max} sites. Remove one to add another.',
        // content overlay / banner
        bannerText:        "⏰ You've been on {host} for a while. Time for a break?",
        bannerDismiss:     'Dismiss',
        overlayMessage:    "You've been on {host} for a while.\nSolve this to take a break!",
        inputPlaceholder:  'Your answer',
        checkButton:       'Check',
        wrongAnswer:       'Wrong! Try again.',
        successTitle:      'Nice work!',
        successSub:        'Back to it — make these minutes count. 🌿'
    },
    ja: {
        // popup chrome
        subtitle:          '時間を使いすぎたくないサイトを登録しましょう。',
        addPlaceholder:    '例: youtube.com',
        addButton:         '追加',
        emptyList:         'まだサイトが登録されていません。',
        removeTitle:       '削除',
        sessionNoActive:   '計測中のサイトはありません',
        sessionNotTracking:'このサイトは対象外です',
        alertAfter:        '通知までの時間',
        minLabel:          '分',
        secLabel:          '秒',
        unitM:             '分',
        unitS:             '秒',
        applyButton:       '適用',
        mathDifficulty:    '計算の難易度',
        diffNone:          'なし（通知のみ）',
        diffEasy:          'やさしい',
        diffMedium:        'ふつう',
        diffHard:          'むずかしい',
        diffVeryHard:      'とてもむずかしい',
        diffSuperHard:     '超むずかしい',
        diffImpossible:    '不可能',
        languageLabel:     '言語',
        // popup errors
        errEnterSite:      'サイトを入力してください。',
        errInvalidSite:    '正しいサイトを入力してください（例: youtube.com）',
        errAlreadyTracked: '{host} はすでに登録されています。',
        errMaxSites:       '登録できるサイトは最大 {max} 件です。追加するには、どれかを削除してください。',
        // content overlay / banner
        bannerText:        '⏰ {host} を見続けてしばらく経ちました。少し休憩しませんか？',
        bannerDismiss:     '閉じる',
        overlayMessage:    '{host} を見続けてしばらく経ちました。\n問題を解いて休憩しましょう！',
        inputPlaceholder:  '答えを入力',
        checkButton:       '確認',
        wrongAnswer:       '不正解です。もう一度どうぞ。',
        successTitle:      'おつかれさま！',
        successSub:        'この時間を大切に。いってらっしゃい 🌿'
    }
};

// Look up a string for `lang`, falling back to English, then to the key itself
// so a missing translation degrades visibly rather than rendering "undefined".
function t(key, lang) {
    const dict = I18N_MESSAGES[lang] || I18N_MESSAGES[I18N_DEFAULT_LANG];
    const fallback = I18N_MESSAGES[I18N_DEFAULT_LANG];
    if (dict && dict[key] != null) return dict[key];
    if (fallback[key] != null) return fallback[key];
    return key;
}

// Same as t(), then substitutes {name} placeholders from `params`.
function tFormat(key, lang, params) {
    let s = t(key, lang);
    if (params) {
        for (const name in params) {
            s = s.split(`{${name}}`).join(params[name]);
        }
    }
    return s;
}
