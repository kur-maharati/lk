/************************************************
 * PORTAL SMK MAHARATI
 * FRONTEND
 ************************************************/


/*
 * ==============================================
 * MASUKKAN URL WEB APP APPS SCRIPT DI SINI
 * ==============================================
 */

const API_URL =
  'https://script.google.com/macros/s/AKfycbx6ZnKQ7Dg9uMkQbOfDEaBsawvq2aJYAZOwi5_urpQ-CLBA9mr06u0A3an8_IC0fg23/exec';


/*
 * Data aplikasi
 */

let menus = [];

let serverOffset = 0;


/*
 * ==============================================
 * START
 * ==============================================
 */

document.addEventListener(
  'DOMContentLoaded',
  function () {

    loadMenus();

  }
);


/*
 * ==============================================
 * JSONP
 * ==============================================
 *
 * Karena frontend berada di GitHub Pages
 * dan backend berada di Google Apps Script,
 * kita menggunakan JSONP.
 */

function loadMenus() {

  const callbackName =
    'portalCallback_' +
    Date.now();


  window[callbackName] =
    function (data) {

      try {

        if (!data.success) {

          showError(
            data.message ||
            'Gagal mengambil data.'
          );

          return;

        }


        /*
         * Hitung selisih waktu server
         * dengan browser.
         */

        serverOffset =
          data.serverTime -
          Date.now();


        /*
         * Simpan menu
         */

        menus =
          data.menus || [];


        /*
         * Tampilkan identitas
         */

        applySettings(
          data.settings
        );


        /*
         * Tampilkan menu
         */

        renderMenus();


        /*
         * Jalankan jam
         */

        startClock();


        /*
         * Update status menu
         * setiap 1 detik.
         */

        setInterval(
          renderMenus,
          1000
        );

      }

      finally {

        delete
          window[callbackName];

      }

    };


  const script =
    document.createElement('script');


  script.src =
    API_URL +
    '?action=menus' +
    '&callback=' +
    callbackName;


  script.onerror =
    function () {

      showError(
        'Tidak dapat terhubung ' +
        'ke server.'
      );

    };


  document.body.appendChild(script);

}


/*
 * ==============================================
 * SETTINGS
 * ==============================================
 */

function applySettings(settings) {

  if (!settings) {
    return;
  }


  document.getElementById(
    'logo'
  ).textContent =
    settings.logo ||
    '🎓';


  document.getElementById(
    'schoolName'
  ).textContent =
    settings.namaSekolah ||
    'SMK Maharati';


  document.getElementById(
    'subtitle'
  ).textContent =
    settings.judul ||
    'Portal Asesmen & Pembelajaran';


  document.getElementById(
    'footer'
  ).textContent =
    settings.footer ||
    '© 2026 SMK Maharati';

}


/*
 * ==============================================
 * RENDER MENU
 * ==============================================
 */

function renderMenus() {

  const container =
    document.getElementById(
      'menuContainer'
    );


  const activeMenus =
    menus.filter(
      function (menu) {

        return menu.aktif;

      }
    );


  if (
    activeMenus.length === 0
  ) {

    container.innerHTML = `

      <div class="empty">

        Belum ada menu yang tersedia.

      </div>

    `;

    return;

  }


  /*
   * Render semua menu
   */

  container.innerHTML = '';


  activeMenus.forEach(
    function (menu) {

      const status =
        getMenuStatus(menu);


      const card =
        document.createElement(
          'div'
        );


      card.className =
        'menu-card ' +
        (
          status.open
            ? 'open'
            : 'locked'
        );


      /*
       * ICON
       */

      const icon =
        status.open
          ? menu.icon
          : '🔒';


      /*
       * STATUS
       */

      let statusHTML = '';


      if (
        status.type === 'always'
      ) {

        statusHTML = `

          <span class="status-open">

            ● Tersedia

          </span>

        `;

      }


      else if (
        status.type === 'open'
      ) {

        statusHTML = `

          <span class="status-open">

            ● Sedang dibuka

          </span>

        `;

      }


      else if (
        status.type === 'before'
      ) {

        statusHTML = `

          <span class="status-before">

            🔒 Dibuka ${status.label}

          </span>

        `;

      }


      else if (
        status.type === 'after'
      ) {

        statusHTML = `

          <span class="status-after">

            🔒 Sudah ditutup

          </span>

        `;

      }


      /*
       * HTML CARD
       */

      card.innerHTML = `

        <div class="menu-icon">

          ${escapeHtml(icon)}

        </div>


        <div class="menu-content">

          <div class="menu-title">

            ${escapeHtml(menu.nama)}

          </div>


          <div class="menu-description">

            ${escapeHtml(menu.deskripsi)}

          </div>


          <div class="menu-status">

            ${statusHTML}

          </div>

        </div>


        <div class="menu-arrow">

          ${status.open ? '➜' : '🔒'}

        </div>

      `;


      /*
       * Hanya menu yang sedang OPEN
       * yang dapat diklik.
       */

      if (
        status.open
      ) {

        card.addEventListener(
          'click',
          function () {

            openMenu(
              menu.id
            );

          }
        );

      }


      container.appendChild(
        card
      );

    }
  );

}


/*
 * ==============================================
 * STATUS MENU
 * ==============================================
 */

function getMenuStatus(menu) {

  /*
   * Tidak punya jadwal =
   * selalu terbuka.
   */

  if (
    !menu.tanggalMulai &&
    !menu.tanggalSelesai
  ) {

    return {

      open: true,

      type: 'always',

      label: ''

    };

  }


  const now =
    new Date(
      Date.now() +
      serverOffset
    );


  let start = null;

  let end = null;


  /*
   * START
   */

  if (
    menu.tanggalMulai
  ) {

    start =
      parseDateTime(
        menu.tanggalMulai,
        menu.jamMulai ||
        '00:00'
      );

  }


  /*
   * END
   */

  if (
    menu.tanggalSelesai
  ) {

    end =
      parseDateTime(
        menu.tanggalSelesai,
        menu.jamSelesai ||
        '23:59'
      );

  }


  /*
   * BELUM BUKA
   */

  if (
    start &&
    now < start
  ) {

    return {

      open: false,

      type: 'before',

      label:
        formatDateTime(start)

    };

  }


  /*
   * SUDAH TUTUP
   */

  if (
    end &&
    now > end
  ) {

    return {

      open: false,

      type: 'after',

      label:
        formatDateTime(end)

    };

  }


  /*
   * SEDANG BUKA
   */

  return {

    open: true,

    type: 'open',

    label: ''

  };

}


/*
 * ==============================================
 * OPEN MENU
 * ==============================================
 */

function openMenu(id) {

  /*
   * Jangan langsung membuka URL.
   *
   * Kirim ID ke Apps Script.
   *
   * Apps Script akan mengecek ulang
   * waktu sebelum redirect.
   */

  const url =
    API_URL +
    '?action=open&id=' +
    encodeURIComponent(id);


  window.location.href =
    url;

}


/*
 * ==============================================
 * PARSE DATE
 * ==============================================
 */

function parseDateTime(
  dateString,
  timeString
) {

  const date =
    dateString.split('-');


  const time =
    timeString.split(':');


  return new Date(

    Number(date[0]),

    Number(date[1]) - 1,

    Number(date[2]),

    Number(time[0] || 0),

    Number(time[1] || 0),

    0

  );

}


/*
 * ==============================================
 * FORMAT DATE TIME
 * ==============================================
 */

function formatDateTime(date) {

  const months = [

    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des'

  ];


  const day =
    String(
      date.getDate()
    ).padStart(2, '0');


  const month =
    months[
      date.getMonth()
    ];


  const hour =
    String(
      date.getHours()
    ).padStart(2, '0');


  const minute =
    String(
      date.getMinutes()
    ).padStart(2, '0');


  return (

    day +
    ' ' +
    month +
    ' ' +
    date.getFullYear() +
    ' ' +
    hour +
    ':' +
    minute +
    ' WIB'

  );

}


/*
 * ==============================================
 * CLOCK
 * ==============================================
 */

function startClock() {

  updateClock();


  setInterval(
    updateClock,
    1000
  );

}


/*
 * ==============================================
 * UPDATE CLOCK
 * ==============================================
 */

function updateClock() {

  const now =
    new Date(
      Date.now() +
      serverOffset
    );


  const day =
    String(
      now.getDate()
    ).padStart(2, '0');


  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, '0');


  const year =
    now.getFullYear();


  const hour =
    String(
      now.getHours()
    ).padStart(2, '0');


  const minute =
    String(
      now.getMinutes()
    ).padStart(2, '0');


  const second =
    String(
      now.getSeconds()
    ).padStart(2, '0');


  document.getElementById(
    'clock'
  ).textContent =

    day +
    '/' +
    month +
    '/' +
    year +
    ' • ' +
    hour +
    ':' +
    minute +
    ':' +
    second +
    ' WIB';

}


/*
 * ==============================================
 * ERROR
 * ==============================================
 */

function showError(message) {

  document.getElementById(
    'menuContainer'
  ).innerHTML = `

    <div class="error">

      ⚠️<br><br>

      ${escapeHtml(message)}

    </div>

  `;

}


/*
 * ==============================================
 * ESCAPE HTML
 * ==============================================
 */

function escapeHtml(text) {

  if (
    text === null ||
    text === undefined
  ) {

    return '';

  }


  return String(text)

    .replace(
      /&/g,
      '&amp;'
    )

    .replace(
      /</g,
      '&lt;'
    )

    .replace(
      />/g,
      '&gt;'
    )

    .replace(
      /"/g,
      '&quot;'
    )

    .replace(
      /'/g,
      '&#039;'
    );

}
