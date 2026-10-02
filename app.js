/* ==================================================
   KONFIGURASI
================================================== */


/*
 * GANTI DENGAN URL WEB APP APPS SCRIPT ANDA
 */
const API_URL =
  "https://script.google.com/macros/s/AKfycbzS7yDnfz5mfeX_aATuqDq_zDSldgSJInvQ_04gQwXXQjIV3q8tyVB9S64OVR5xxQg/exec";


/*
 * Cache browser.
 */
const CACHE_KEY =
  "SMK_MAHARATI_PORTAL_CACHE_V1";


/*
 * Maksimal waktu menunggu satu request.
 */
const REQUEST_TIMEOUT =
  7000;


/*
 * Jumlah percobaan.
 */
const MAX_RETRY =
  3;


/*
 * Jeda retry.
 */
const RETRY_DELAY = [
  1000,
  2500
];


/*
 * Selisih waktu server dan browser.
 */
let serverTimeOffset =
  0;


/*
 * Data menu saat ini.
 */
let currentMenus =
  [];


/* ==================================================
   ELEMENT
================================================== */

const menuContainer =
  document.getElementById(
    "menuContainer"
  );


const errorContainer =
  document.getElementById(
    "errorContainer"
  );


const errorMessage =
  document.getElementById(
    "errorMessage"
  );


const retryButton =
  document.getElementById(
    "retryButton"
  );


const connectionStatus =
  document.getElementById(
    "connectionStatus"
  );


const statusText =
  document.getElementById(
    "statusText"
  );


const clockElement =
  document.getElementById(
    "clock"
  );


/* ==================================================
   START
================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    /*
     * Jalankan jam.
     */
    startClock();


    /*
     * Tampilkan cache jika ada.
     */
    const hasCache =
      loadCache();


    /*
     * Tetap minta data terbaru.
     */
    loadFromServer(
      hasCache
    );

  }
);


/* ==================================================
   CLOCK
================================================== */

function startClock() {

  updateClock();


  setInterval(
    updateClock,
    1000
  );

}


function updateClock() {

  const now =
    new Date(
      Date.now() +
      serverTimeOffset
    );


  const hours =
    String(
      now.getHours()
    ).padStart(
      2,
      "0"
    );


  const minutes =
    String(
      now.getMinutes()
    ).padStart(
      2,
      "0"
    );


  const seconds =
    String(
      now.getSeconds()
    ).padStart(
      2,
      "0"
    );


  clockElement.textContent =
    `${hours}:${minutes}:${seconds}`;

}


/* ==================================================
   LOAD CACHE
================================================== */

function loadCache() {

  try {

    const raw =
      localStorage.getItem(
        CACHE_KEY
      );


    if (!raw) {

      return false;

    }


    const cache =
      JSON.parse(
        raw
      );


    if (
      !cache ||
      !Array.isArray(
        cache.menus
      )
    ) {

      return false;

    }


    /*
     * Gunakan data cache.
     */
    currentMenus =
      cache.menus;


    /*
     * Setting.
     */
    renderSettings(
      cache.settings ||
      {}
    );


    /*
     * Menu.
     */
    renderMenus(
      currentMenus
    );


    /*
     * Status.
     */
    setConnectionStatus(
      "offline",
      "Data tersimpan"
    );


    return true;

  } catch (error) {

    console.warn(
      "Cache error:",
      error
    );


    return false;

  }

}


/* ==================================================
   LOAD SERVER
================================================== */

async function loadFromServer(
  hasCache
) {

  hideError();


  setConnectionStatus(
    "loading",
    hasCache
      ? "Memperbarui data..."
      : "Menghubungkan..."
  );


  if (!hasCache) {

    showLoading(
      "Menghubungkan ke server..."
    );

  }


  let lastError =
    null;


  /*
   * RETRY
   */
  for (
    let attempt = 1;
    attempt <= MAX_RETRY;
    attempt++
  ) {

    try {

      if (!hasCache) {

        showLoading(

          attempt === 1

            ? "Memuat menu..."

            : `Mencoba kembali (${attempt}/${MAX_RETRY})...`

        );

      }


      /*
       * Panggil Apps Script.
       */
      const data =
        await requestJSONP(
          API_URL +
          "?action=menus",
          REQUEST_TIMEOUT
        );


      /*
       * Validasi response.
       */
      if (
        !data ||
        data.success !== true
      ) {

        throw new Error(
          data &&
          data.message

            ? data.message

            : "Response server tidak valid."
        );

      }


      /*
       * Hitung waktu server.
       */
      if (
        data.serverTime
      ) {

        serverTimeOffset =
          data.serverTime -
          Date.now();

      }


      /*
       * Simpan menu.
       */
      currentMenus =
        Array.isArray(
          data.menus
        )
          ? data.menus
          : [];


      /*
       * Render setting.
       */
      renderSettings(
        data.settings ||
        {}
      );


      /*
       * Render menu.
       */
      renderMenus(
        currentMenus
      );


      /*
       * Simpan cache.
       */
      saveCache(
        data
      );


      /*
       * Berhasil.
       */
      setConnectionStatus(
        "online",
        "Terhubung"
      );


      hideError();


      return;


    } catch (error) {

      lastError =
        error;


      console.warn(
        "Request gagal:",
        error
      );


      /*
       * Retry.
       */
      if (
        attempt <
        MAX_RETRY
      ) {

        const delay =
          RETRY_DELAY[
            attempt - 1
          ] || 2000;


        if (!hasCache) {

          showLoading(
            "Server belum merespons. Mencoba lagi..."
          );

        }


        await sleep(
          delay
        );

      }

    }

  }


  /*
   * Semua retry gagal.
   */

  if (hasCache) {

    /*
     * Jangan hapus menu.
     *
     * Gunakan cache.
     */
    setConnectionStatus(
      "offline",
      "Menggunakan data tersimpan"
    );


    return;

  }


  /*
   * Tidak ada cache.
   */
  setConnectionStatus(
    "error",
    "Tidak terhubung"
  );


  showError(
    getFriendlyError(
      lastError
    )
  );

}


/* ==================================================
   JSONP REQUEST
================================================== */

function requestJSONP(
  baseUrl,
  timeout
) {

  return new Promise(
    function(
      resolve,
      reject
    ) {

      /*
       * Callback unik.
       */
      const callbackName =
        "portalCallback_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(36)
          .substring(2);


      /*
       * Script.
       */
      const script =
        document.createElement(
          "script"
        );


      let finished =
        false;


      /*
       * Cleanup.
       */
      function cleanup() {

        if (
          finished
        ) {

          return;

        }


        finished =
          true;


        clearTimeout(
          timer
        );


        try {

          delete window[
            callbackName
          ];

        } catch (error) {

          window[
            callbackName
          ] = undefined;

        }


        if (
          script.parentNode
        ) {

          script.parentNode
            .removeChild(
              script
            );

        }

      }


      /*
       * Callback JSONP.
       */
      window[
        callbackName
      ] =
        function(data) {

          cleanup();

          resolve(
            data
          );

        };


      /*
       * Error.
       */
      script.onerror =
        function() {

          cleanup();

          reject(
            new Error(
              "Tidak dapat terhubung ke server."
            )
          );

        };


      /*
       * TIMEOUT.
       */
      const timer =
        setTimeout(
          function() {

            cleanup();

            reject(
              new Error(
                "Koneksi ke server terlalu lama."
              )
            );

          },
          timeout
        );


      /*
       * Anti browser cache.
       */
      const separator =
        baseUrl.includes(
          "?"
        )
          ? "&"
          : "?";


      script.src =
        baseUrl +
        separator +
        "callback=" +
        encodeURIComponent(
          callbackName
        ) +
        "&_=" +
        Date.now();


      script.async =
        true;


      document.head.appendChild(
        script
      );

    }
  );

}


/* ==================================================
   SAVE CACHE
================================================== */

function saveCache(
  data
) {

  try {

    /*
     * Hanya simpan data publik.
     *
     * URL tidak disimpan.
     */
    const menus =
      Array.isArray(
        data.menus
      )

        ? data.menus.map(
            function(menu) {

              return {

                id:
                  menu.id,

                name:
                  menu.name,

                description:
                  menu.description,

                icon:
                  menu.icon,

                startTimestamp:
                  menu.startTimestamp,

                endTimestamp:
                  menu.endTimestamp,

                active:
                  menu.active,

                order:
                  menu.order

              };

            }
          )

        : [];


    const cache = {

      savedAt:
        Date.now(),

      serverTime:
        data.serverTime ||
        null,

      settings:
        data.settings ||
        {},

      menus:
        menus

    };


    localStorage.setItem(

      CACHE_KEY,

      JSON.stringify(
        cache
      )

    );

  } catch (error) {

    console.warn(
      "Tidak dapat menyimpan cache:",
      error
    );

  }

}


/* ==================================================
   RENDER SETTINGS
================================================== */

function renderSettings(
  settings
) {

  const schoolName =
    document.getElementById(
      "schoolName"
    );


  const pageTitle =
    document.getElementById(
      "pageTitle"
    );


  const footer =
    document.getElementById(
      "footer"
    );


  if (
    settings.schoolName
  ) {

    schoolName.textContent =
      settings.schoolName;


    document.title =
      settings.schoolName;

  }


  if (
    settings.title
  ) {

    pageTitle.textContent =
      settings.title;

  }


  if (
    settings.footer
  ) {

    footer.textContent =
      settings.footer;

  }

}


/* ==================================================
   RENDER MENU
================================================== */

function renderMenus(
  menus
) {

  menuContainer.innerHTML =
    "";


  if (
    !Array.isArray(
      menus
    ) ||
    menus.length === 0
  ) {

    menuContainer.innerHTML =

      `
      <div class="loading-container">

        <p>
          Belum ada menu tersedia.
        </p>

      </div>
      `;


    return;

  }


  menus.forEach(
    function(menu) {

      const card =
        createMenuCard(
          menu
        );


      menuContainer.appendChild(
        card
      );

    }
  );

}


/* ==================================================
   CREATE MENU
================================================== */

function createMenuCard(
  menu
) {

  const card =
    document.createElement(
      "div"
    );


  const status =
    getMenuStatus(
      menu
    );


  const isOpen =
    status === "open";


  card.className =
    "menu-card " +
    (
      isOpen
        ? ""
        : "locked"
    );


  /*
   * ICON
   */
  const icon =
    document.createElement(
      "div"
    );


  icon.className =
    "menu-icon";


  icon.textContent =
    menu.icon ||
    "🔗";


  /*
   * CONTENT
   */
  const content =
    document.createElement(
      "div"
    );


  content.className =
    "menu-content";


  const name =
    document.createElement(
      "div"
    );


  name.className =
    "menu-name";


  name.textContent =
    menu.name ||
    "Menu";


  const description =
    document.createElement(
      "div"
    );


  description.className =
    "menu-description";


  description.textContent =
    menu.description ||
    "";


  content.appendChild(
    name
  );


  content.appendChild(
    description
  );


  /*
   * STATUS
   */
  const statusElement =
    document.createElement(
      "div"
    );


  statusElement.className =
    "menu-status " +
    (
      isOpen
        ? "status-open"
        : "status-locked"
    );


  statusElement.textContent =
    isOpen
      ? "↗"
      : "🔒";


  /*
   * Gabungkan.
   */
  card.appendChild(
    icon
  );


  card.appendChild(
    content
  );


  card.appendChild(
    statusElement
  );


  /*
   * Click.
   */
  card.addEventListener(
    "click",
    function() {

      handleMenuClick(
        menu,
        isOpen
      );

    }
  );


  return card;

}


/* ==================================================
   MENU STATUS
================================================== */

function getMenuStatus(
  menu
) {

  /*
   * Tidak aktif.
   */
  if (
    !menu.active
  ) {

    return "closed";

  }


  const now =
    Date.now() +
    serverTimeOffset;


  /*
   * Belum mulai.
   */
  if (
    menu.startTimestamp &&
    now <
      menu.startTimestamp
  ) {

    return "closed";

  }


  /*
   * Sudah selesai.
   */
  if (
    menu.endTimestamp &&
    now >
      menu.endTimestamp
  ) {

    return "closed";

  }


  return "open";

}


/* ==================================================
   MENU CLICK
================================================== */
async function handleMenuClick(
  menu,
  isOpen
) {

  /*
   * Terkunci.
   */
  if (!isOpen) {

    return;

  }


  /*
   * Tampilkan status.
   */
  setConnectionStatus(
    "loading",
    "Memverifikasi akses..."
  );


  try {

    /*
     * Apps Script hanya menerima ID menu.
     *
     * Apps Script kemudian:
     *
     * 1. mencari menu di Spreadsheet
     * 2. mengecek aktif/tidak
     * 3. mengecek tanggal
     * 4. mengecek jam
     * 5. mengambil URL dari kolom E
     */
    const url =
      API_URL +
      "?action=open" +
      "&id=" +
      encodeURIComponent(
        menu.id
      );


    /*
     * Minta Apps Script
     * mengembalikan data JSONP.
     */
    const data =
      await requestJSONP(
        url,
        REQUEST_TIMEOUT
      );


    /*
     * Validasi response.
     */
    if (
      !data ||
      data.success !== true
    ) {

      setConnectionStatus(
        "online",
        "Terhubung"
      );


      alert(
        data &&
        data.message

          ? data.message

          : "Menu tidak dapat dibuka."
      );


      return;

    }


    /*
     * Pastikan URL tujuan tersedia.
     */
    if (
      !data.url
    ) {

      setConnectionStatus(
        "error",
        "URL tidak tersedia"
      );


      alert(
        "URL tujuan menu tidak ditemukan."
      );


      return;

    }


    /*
     * PENTING:
     *
     * Browser sekarang langsung membuka
     * URL asli dari kolom E Spreadsheet.
     *
     * BUKAN membuka URL Apps Script.
     */
    window.location.href =
      data.url;


  } catch (error) {

    console.error(
      "Gagal membuka menu:",
      error
    );


    setConnectionStatus(
      "error",
      "Koneksi bermasalah"
    );


    alert(
      "Tidak dapat memverifikasi akses menu. " +
      "Silakan coba lagi."
    );

  }

}
/* ==================================================
   SHOW LOADING
================================================== */

function showLoading(
  message
) {

  hideError();


  menuContainer.innerHTML =

    `
    <div class="loading-container">

      <div class="spinner"></div>

      <p>
        ${escapeHtml(message)}
      </p>

    </div>
    `;

}


/* ==================================================
   SHOW ERROR
================================================== */

function showError(
  message
) {

  errorMessage.textContent =
    message;


  errorContainer.classList.remove(
    "hidden"
  );


  menuContainer.innerHTML =
    "";


  retryButton.onclick =
    function() {

      loadFromServer(
        false
      );

    };

}


/* ==================================================
   HIDE ERROR
================================================== */

function hideError() {

  errorContainer.classList.add(
    "hidden"
  );

}


/* ==================================================
   STATUS
================================================== */

function setConnectionStatus(
  type,
  message
) {

  connectionStatus.className =
    "connection-status " +
    type;


  statusText.textContent =
    message;

}


/* ==================================================
   FRIENDLY ERROR
================================================== */

function getFriendlyError(
  error
) {

  if (!error) {

    return (
      "Server tidak dapat dihubungi. " +
      "Silakan coba lagi."
    );

  }


  const message =
    String(
      error.message ||
      ""
    )
      .toLowerCase();


  if (
    message.includes(
      "terlalu lama"
    )
  ) {

    return (
      "Server membutuhkan waktu terlalu lama " +
      "untuk merespons."
    );

  }


  return (
    "Data menu belum dapat diperbarui. " +
    "Periksa koneksi internet lalu coba lagi."
  );

}


/* ==================================================
   SLEEP
================================================== */

function sleep(
  milliseconds
) {

  return new Promise(
    function(resolve) {

      setTimeout(
        resolve,
        milliseconds
      );

    }
  );

}


/* ==================================================
   ESCAPE HTML
================================================== */

function escapeHtml(
  value
) {

  return String(
    value
  )

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* ==================================================
   UPDATE MENU OTOMATIS
================================================== */

/*
 * Setiap detik mengecek apakah menu
 * sudah masuk waktu buka/tutup.
 *
 * Jadi tidak perlu refresh halaman.
 */

setInterval(
  function() {

    if (
      currentMenus.length > 0
    ) {

      renderMenus(
        currentMenus
      );

    }

  },
  1000
);
