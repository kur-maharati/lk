/* =========================================================
   URL WEB APP APPS SCRIPT
========================================================= */

const API_URL =
  "https://script.google.com/macros/s/AKfycbzp7qrLk-kkvJD9WEaZLHtwfQcWjYEVWEcUnvhrBm_ZTDeXkcEf2TcXxrqPtsH7Wng2/exec";


/* =========================================================
   KONFIGURASI
========================================================= */

const CACHE_KEY =
  "SMK_MAHARATI_PORTAL_V3";

const REQUEST_TIMEOUT =
  7000;

const MAX_RETRY =
  3;

const RETRY_DELAY = [
  1000,
  2500,
  4000
];


let serverTimeOffset =
  0;

let portalData =
  null;


/* =========================================================
   ELEMENT
========================================================= */

const schoolNameEl =
  document.getElementById(
    "schoolName"
  );

const pageTitleEl =
  document.getElementById(
    "pageTitle"
  );

const footerEl =
  document.getElementById(
    "footer"
  );

const menuContainerEl =
  document.getElementById(
    "menuContainer"
  );

const connectionStatusEl =
  document.getElementById(
    "connectionStatus"
  );


/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    loadPortal();

  }
);


/* =========================================================
   LOAD PORTAL
========================================================= */

async function loadPortal() {

  const cached =
    loadLocalCache();


  /*
    Jika ada cache,
    tampilkan terlebih dahulu.
  */

  if (cached) {

    portalData =
      cached;


    updateServerOffset(
      cached.serverTime
    );


    renderPortal(
      cached
    );


    setConnectionStatus(
      "offline",
      "Memuat pembaruan..."
    );

  } else {

    setConnectionStatus(
      "loading",
      "Memuat menu..."
    );

  }


  /*
    Ambil data terbaru.
  */

  try {

    const data =
      await loadFromServer();


    portalData =
      data;


    updateServerOffset(
      data.serverTime
    );


    saveLocalCache(
      data
    );


    renderPortal(
      data
    );


    setConnectionStatus(
      "online",
      "Terhubung"
    );


  } catch (error) {

    console.error(
      error
    );


    if (cached) {

      setConnectionStatus(
        "offline",
        "Mode offline"
      );

    } else {

      showServerError();

    }

  }


  /*
    Periksa status setiap detik.
  */

  setInterval(
    function() {

      if (portalData) {

        renderMenus(
          portalData.menus
        );

      }

    },
    1000
  );

}


/* =========================================================
   LOAD SERVER
========================================================= */

async function loadFromServer() {

  let lastError =
    null;


  for (
    let attempt = 0;
    attempt < MAX_RETRY;
    attempt++
  ) {

    try {

      const callbackName =
        "load_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(36)
          .substring(2);


      const url =
        API_URL +
        "?action=menus" +
        "&callback=" +
        callbackName +
        "&_=" +
        Date.now();


      return await requestJSONP(
        url,
        REQUEST_TIMEOUT
      );


    } catch (error) {

      lastError =
        error;


      if (
        attempt <
        MAX_RETRY - 1
      ) {

        await sleep(
          RETRY_DELAY[
            attempt
          ]
        );

      }

    }

  }


  throw (
    lastError ||
    new Error(
      "Server tidak dapat dihubungi."
    )
  );

}


/* =========================================================
   JSONP
========================================================= */

function requestJSONP(
  url,
  timeout
) {

  return new Promise(
    function(resolve, reject) {

      const callbackName =
        "jsonp_" +
        Date.now() +
        "_" +
        Math.random()
          .toString(36)
          .substring(2);


      let finished =
        false;


      const script =
        document.createElement(
          "script"
        );


      const timer =
        setTimeout(
          function() {

            finish(
              new Error(
                "Request timeout."
              )
            );

          },
          timeout
        );


      function finish(
        error,
        data
      ) {

        if (finished) {

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

        } catch (e) {

          window[
            callbackName
          ] = undefined;

        }


        if (
          script.parentNode
        ) {

          script.parentNode.removeChild(
            script
          );

        }


        if (error) {

          reject(
            error
          );

        } else {

          resolve(
            data
          );

        }

      }


      window[
        callbackName
      ] = function(data) {

        finish(
          null,
          data
        );

      };


      script.onerror =
        function() {

          finish(
            new Error(
              "Tidak dapat terhubung ke server."
            )
          );

        };


      /*
        Ganti callback sementara
        dengan callback sebenarnya.
      */

      script.src =
        url.replace(
          /callback=[^&]+/,
          "callback=" +
          encodeURIComponent(
            callbackName
          )
        );


      document.body.appendChild(
        script
      );

    }
  );

}


/* =========================================================
   KLIK MENU
========================================================= */

async function handleMenuClick(
  menu
) {

  setConnectionStatus(
    "loading",
    "Memeriksa akses..."
  );


  try {

    /*
      Hanya ID yang dikirim.

      BUKAN URL.

      Apps Script akan mencari
      URL berdasarkan ID tersebut
      di Spreadsheet.
    */

    const callbackName =
      "open_" +
      Date.now() +
      "_" +
      Math.random()
        .toString(36)
        .substring(2);


    const url =
      API_URL +
      "?action=open" +
      "&id=" +
      encodeURIComponent(
        menu.id
      ) +
      "&callback=" +
      callbackName +
      "&_=" +
      Date.now();


    const data =
      await requestJSONP(
        url,
        REQUEST_TIMEOUT
      );


    /*
      Ditolak server.
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
      ==================================================
      BUKA URL ASLI
      ==================================================

      data.url berasal dari:

      Spreadsheet kolom E

      Jadi setiap menu bisa memiliki
      URL berbeda.
    */

    if (
      data.url
    ) {

      window.location.href =
        data.url;

      return;

    }


    alert(
      "URL tujuan tidak ditemukan."
    );


  } catch (error) {

    console.error(
      "Gagal membuka menu:",
      error
    );


    setConnectionStatus(
      "offline",
      "Koneksi bermasalah"
    );


    alert(
      "Tidak dapat menghubungi server. Silakan coba lagi."
    );

  }

}


/* =========================================================
   RENDER
========================================================= */

function renderPortal(
  data
) {

  if (!data) {
    return;
  }


  renderSettings(
    data.settings
  );


  renderMenus(
    data.menus
  );

}


/* =========================================================
   SETTINGS
========================================================= */

function renderSettings(
  settings
) {

  if (!settings) {
    return;
  }


  if (
    schoolNameEl
  ) {

    schoolNameEl.textContent =
      settings.schoolName ||
      "SMK Maharati";

  }


  if (
    pageTitleEl
  ) {

    pageTitleEl.textContent =
      settings.title ||
      "Portal Asesmen & Pembelajaran";

  }


  if (
    footerEl
  ) {

    footerEl.textContent =
      settings.footer ||
      "© 2026 SMK Maharati";

  }

}


/* =========================================================
   RENDER MENU
========================================================= */

function renderMenus(
  menus
) {

  if (
    !menuContainerEl
  ) {

    return;

  }


  if (
    !menus ||
    menus.length === 0
  ) {

    menuContainerEl.innerHTML = `
      <div class="empty-state">
        Belum ada menu tersedia.
      </div>
    `;

    return;

  }


  menuContainerEl.innerHTML =
    menus
      .map(
        function(menu) {

          return createMenuCard(
            menu
          );

        }
      )
      .join("");


  /*
    Event klik
  */

  menuContainerEl
    .querySelectorAll(
      "[data-menu-id]"
    )
    .forEach(
      function(button) {

        button.addEventListener(
          "click",
          function() {

            const id =
              button.getAttribute(
                "data-menu-id"
              );


            const menu =
              menus.find(
                function(item) {

                  return (
                    String(
                      item.id
                    ) ===
                    String(id)
                  );

                }
              );


            if (!menu) {
              return;
            }


            const status =
              getMenuStatus(
                menu
              );


            if (
              !status.open
            ) {

              return;

            }


            handleMenuClick(
              menu
            );

          }
        );

      }
    );

}


/* =========================================================
   CARD MENU
========================================================= */

function createMenuCard(
  menu
) {

  const status =
    getMenuStatus(
      menu
    );


  const locked =
    !status.open;


  const icon =
    locked
      ? "🔒"
      : (
          menu.icon ||
          "🔗"
        );


  const statusText =
    locked
      ? status.text
      : "Buka";


  return `
    <button
      type="button"
      class="menu-card ${
        locked
          ? "locked"
          : "open"
      }"
      data-menu-id="${escapeHTML(
        menu.id
      )}"
      ${
        locked
          ? 'aria-disabled="true"'
          : ""
      }
    >

      <div class="menu-icon">
        ${escapeHTML(
          icon
        )}
      </div>


      <div class="menu-content">

        <div class="menu-name">
          ${escapeHTML(
            menu.name
          )}
        </div>


        <div class="menu-description">
          ${escapeHTML(
            menu.description ||
            ""
          )}
        </div>


        <div class="menu-status">
          ${escapeHTML(
            statusText
          )}
        </div>

      </div>


      <div class="menu-arrow">
        ${
          locked
            ? "🔒"
            : "→"
        }
      </div>

    </button>
  `;

}


/* =========================================================
   STATUS MENU
========================================================= */

function getMenuStatus(
  menu
) {

  const now =
    Date.now() +
    serverTimeOffset;


  if (
    !menu.active
  ) {

    return {

      open: false,

      text:
        "Tidak aktif"

    };

  }


  if (
    menu.startTimestamp &&
    now <
    menu.startTimestamp
  ) {

    return {

      open: false,

      text:
        "Belum dibuka"

    };

  }


  if (
    menu.endTimestamp &&
    now >
    menu.endTimestamp
  ) {

    return {

      open: false,

      text:
        "Sudah ditutup"

    };

  }


  return {

    open: true,

    text:
      "Buka"

  };

}


/* =========================================================
   SERVER OFFSET
========================================================= */

function updateServerOffset(
  serverTime
) {

  if (!serverTime) {
    return;
  }


  serverTimeOffset =
    Number(
      serverTime
    ) -
    Date.now();

}


/* =========================================================
   CACHE
========================================================= */

function saveLocalCache(
  data
) {

  try {

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify(
        data
      )
    );

  } catch (error) {

    console.warn(
      error
    );

  }

}


function loadLocalCache() {

  try {

    const data =
      localStorage.getItem(
        CACHE_KEY
      );


    if (!data) {
      return null;
    }


    return JSON.parse(
      data
    );

  } catch (error) {

    return null;

  }

}


/* =========================================================
   STATUS KONEKSI
========================================================= */

function setConnectionStatus(
  type,
  message
) {

  if (
    !connectionStatusEl
  ) {

    return;

  }


  connectionStatusEl.className =
    "connection-status " +
    type;


  connectionStatusEl.textContent =
    message;

}


/* =========================================================
   ERROR
========================================================= */

function showServerError() {

  if (
    !menuContainerEl
  ) {

    return;

  }


  menuContainerEl.innerHTML = `
    <div class="empty-state">

      <div style="font-size:40px;">
        ⚠️
      </div>

      <div style="margin-top:10px;">
        Tidak dapat terhubung ke server.
      </div>

      <button
        onclick="location.reload()"
        style="margin-top:15px;"
      >
        Coba Lagi
      </button>

    </div>
  `;

}


/* =========================================================
   SLEEP
========================================================= */

function sleep(
  ms
) {

  return new Promise(
    function(resolve) {

      setTimeout(
        resolve,
        ms
      );

    }
  );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
  value
) {

  return String(
    value || ""
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
