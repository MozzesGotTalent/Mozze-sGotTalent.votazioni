document.addEventListener("DOMContentLoaded", function () {
  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDlyGmWf31sHXLYiCNPnXfRnfdXXx-6S8A",
    authDomain: "mozze-s-got-talent.firebaseapp.com",
    databaseURL:
      "https://mozze-s-got-talent-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "mozze-s-got-talent",
    storageBucket: "mozze-s-got-talent.appspot.com",
    messagingSenderId: "418567627270",
    appId: "1:418567627270:web:6d4e6d51893539c101d987",
  };

  // Initialize Firebase
  if (typeof firebase === "undefined") {
    console.error("Firebase is not loaded. Please check your script includes.");
    return;
  }
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  // DOM elements
  const adminPartecipantiList = document.getElementById("adminPartecipanti");
  const storage = firebase.storage(); // Inizializza Firebase Storage
  const addPartecipanteForm = document.getElementById("addPartecipanteForm");
  const statoVotazioniEl = document.getElementById("statoVotazioni");
  const toggleVotazioniBtn = document.getElementById("toggleVotazioni");
  const partecipantiList = document.getElementById("partecipanti");
  const messaggioVotazioni = document.getElementById("messaggioVotazioni");
  const messaggioVotazioniInstagram = document.getElementById(
    "idcontainer-messageVotazioni"
  );
  const popup = document.getElementById("voteWarningPopup");
  const okButton = document.getElementById("popupOkBtn");

  const currentPage = window.location.pathname;
  if (
    currentPage.includes("index.html") ||
    currentPage === "/" ||
    currentPage === "/Mozze-sGotTalent.votazioni/"
  ) {
    // Nascondi il popup quando viene cliccato il pulsante "Ok"
    okButton.addEventListener("click", function () {
      popup.style.display = "none";
      // Continua con il resto della logica solo dopo la chiusura del popup
    });
  }
  // Ensure all elements are found
  const elements = [
    { name: "adminPartecipantiList", element: adminPartecipantiList },
    { name: "addPartecipanteForm", element: addPartecipanteForm },
    { name: "statoVotazioniEl", element: statoVotazioniEl },
    { name: "toggleVotazioniBtn", element: toggleVotazioniBtn },
    { name: "partecipantiList", element: partecipantiList },
    { name: "messaggioVotazioni", element: messaggioVotazioni },
  ];

  elements.forEach(({ name, element }) => {
    if (!element) {
      console.error(`Missing DOM element: ${name}`);
      return;
    }
  });

  // Load voting status
  db.ref("statoVotazioni").on("value", (snapshot) => {
    const stato = snapshot.val();
    statoVotazioniEl.textContent = stato ? "Aperte" : "Chiuse";
    if (messaggioVotazioni) {
      messaggioVotazioni.textContent = stato ? "" : "Le votazioni sono chiuse.";
    }
    toggleVotazioniBtn.textContent = stato
      ? "Chiudi Votazioni"
      : "Apri Votazioni";
  });

  // Load participants
  // Load participants
  if (partecipantiList) {
    db.ref("statoVotazioni").on("value", (snapshot) => {
      const stato = snapshot.val();

      if (stato === false) {
        partecipantiList.innerHTML = "";
        messaggioVotazioni.textContent = "Votazioni CHIUSE al momento";
        messaggioVotazioniInstagram.style.display = "flex";
        popup.style.display = "none";
      } else if (stato === true) {
        messaggioVotazioni.textContent = "";
        messaggioVotazioniInstagram.style.display = "none";
        popup.style.display = "flex";
        db.ref("partecipanti").on("value", (snapshot) => {
          let partecipanti = snapshot.val();
          partecipantiList.innerHTML = "";

          if (partecipanti) {
            // Converti l'oggetto dei partecipanti in un array
            partecipanti = Object.entries(partecipanti).map(
              ([id, partecipante]) => ({
                id, // Mantieni l'id
                ...partecipante, // Espandi l'oggetto partecipante
              })
            );

            if (stato === true) {
              partecipanti.sort(
                (a, b) => a.performanceNumber - b.performanceNumber
              );

              // Aggiungi i partecipanti al DOM
              partecipanti.forEach((partecipante) => {
                const numeroEsibizione = partecipante.performanceNumber
                  .toString()
                  .padStart(2, "0");
                const div = document.createElement("div");
                div.className = "partecipante";
                div.innerHTML = `
              <img class="immagine" src="${partecipante.immagineUrl}" alt="${partecipante.nome}" width="100" />
              <div class="number-wrapper">
              <div class="number">${numeroEsibizione}</div>
              </div>
              <div class="name-wrapper">
              <div class="name">${partecipante.nome}</div>
              </div>

              <button class="votaBtn" data-id="${partecipante.id}">Vota</button>
            `;
                partecipantiList.appendChild(div);
              });
            }

            // Aggiungi event listeners per i pulsanti di voto
            document.querySelectorAll(".votaBtn").forEach((button) => {
              button.addEventListener("click", votaPartecipante);

              // Disabilita il pulsante se l'utente ha già votato
              if (localStorage.getItem("votato")) {
                popup.style.display = "none";
                button.classList.add("già-votato");
                button.disabled = true; // Disabilita il pulsante
              }
            });
          }
        });
      }
    });
  }

  addPartecipanteForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome").value;
    const immagineFile = document.getElementById("foto").files[0]; // Ottieni il file immagine
    const performanceNumber =
      document.getElementById("performanceNumber").value;

    const nuovoPartecipanteRef = db.ref("partecipanti").push();

    if (!immagineFile) {
      // Se non viene caricata un'immagine, imposta l'immagine predefinita "user.jpg"
      nuovoPartecipanteRef.set({
        nome: nome,
        voti: 0,
        immagineUrl: "user.jpg", // Usa l'immagine predefinita
        performanceNumber: performanceNumber,
      });
      addPartecipanteForm.reset();
    } else {
      const immagineRef = storage.ref(
        `immaginiPartecipanti/${nuovoPartecipanteRef.key}-${immagineFile.name}`
      );

      // Carica l'immagine su Firebase Storage
      immagineRef
        .put(immagineFile)
        .then((snapshot) => {
          snapshot.ref.getDownloadURL().then((url) => {
            // Salva il partecipante con l'URL dell'immagine nel database
            nuovoPartecipanteRef.set({
              nome: nome,
              voti: 0,
              immagineUrl: url || "user.jpg", // Salva l'URL dell'immagine o l'immagine predefinita
              performanceNumber: performanceNumber,
            });
            addPartecipanteForm.reset();
          });
        })
        .catch((error) => {
          console.error("Errore durante il caricamento dell'immagine:", error);
        });
    }
  });

  // Toggle voting state
  toggleVotazioniBtn.addEventListener("click", () => {
    db.ref("statoVotazioni")
      .once("value")
      .then((snapshot) => {
        const stato = snapshot.val();
        db.ref("statoVotazioni").set(!stato);
      });
  });

  // Function to vote for a participant (limited to one vote per user)
  function votaPartecipante(e) {
    const id = e.target.getAttribute("data-id");
    const button = e.target;

    // Disabilita il pulsante di voto immediatamente
    button.classList.add("già-votato"); // Aggiungi classe per indicare già votato
    button.disabled = true; // Disabilita il pulsante

    // Check if user has already voted
    if (localStorage.getItem("votato")) {
      alert("Hai già votato.");
      return;
    }

    // Aggiungi il voto al partecipante
    db.ref("statoVotazioni")
      .once("value")
      .then((snapshot) => {
        const stato = snapshot.val();
        if (!stato) {
          alert("Le votazioni sono chiuse.");
          return;
        }
        const partecipanteRef = db.ref(`partecipanti/${id}`);
        partecipanteRef.once("value").then((snapshot) => {
          const partecipante = snapshot.val();
          partecipanteRef.update({ voti: partecipante.voti + 1 });
          localStorage.setItem("votato", id); // Imposta il flag per impedire più voti

          // Disabilita tutti i pulsanti di voto
          document.querySelectorAll(".votaBtn").forEach((btn) => {
            btn.disabled = true;
          });

          // Ricarica la pagina dopo il voto
          location.reload();
        });
      });
  }
  // Carica i partecipanti nell'admin e permette la rimozione
  db.ref("partecipanti").on("value", (snapshot) => {
    const partecipanti = snapshot.val();
    const adminPartecipantiList = document.getElementById(
      "adminPartecipantiList"
    );

    if (!adminPartecipantiList) {
      console.error("Elemento adminPartecipantiList non trovato!");
      return;
    }

    adminPartecipantiList.innerHTML = "";

    const partecipantiArray = [];
    for (let id in partecipanti) {
      partecipantiArray.push({
        id: id,
        nome: partecipanti[id].nome,
        voti: partecipanti[id].voti,
        immagineUrl: partecipanti[id].immagineUrl || "user.jpg", // Assicurati di avere anche l'URL dell'immagine
        performanceNumber: partecipanti[id].performanceNumber,
      });
    }

    // Ordina i partecipanti in ordine crescente di voti
    partecipantiArray.sort((a, b) => a.voti - b.voti);

    partecipantiArray.forEach((partecipante) => {
      const li = document.createElement("li");
      li.style.transition = "all 0.5s ease"; // Animazione di transizione
      li.innerHTML = `
            <img src="${partecipante.immagineUrl}" alt="${partecipante.nome}" width="100" />
            ${partecipante.nome} - Voti: ${partecipante.voti} - Esibizione N°: ${partecipante.performanceNumber}
            <button class="rimuoviBtn" data-id="${partecipante.id}">Rimuovi</button>
        `;
      adminPartecipantiList.appendChild(li);
    });

    // Aggiungi listener per la rimozione dei partecipanti
    document.querySelectorAll(".rimuoviBtn").forEach((button) => {
      button.addEventListener("click", rimuoviPartecipante);
    });
  });

  // Funzione per rimuovere un partecipante
  function rimuoviPartecipante(e) {
    const id = e.target.getAttribute("data-id");
    const partecipanteRef = db.ref(`partecipanti/${id}`);
    partecipanteRef
      .remove() // Rimuove il partecipante dal database
      .then(() => {
        console.log(`Partecipante ${id} rimosso con successo.`);
      })
      .catch((error) => {
        console.error("Errore durante la rimozione del partecipante:", error);
      });
  }

  // Funzione per ottenere i voti e creare la classifica con animazione stile Eurovision
  function mostraClassifica() {
    firebase
      .database()
      .ref("partecipanti")
      .once("value", (snapshot) => {
        const partecipanti = [];
        let totaleVoti = 0;

        snapshot.forEach((childSnapshot) => {
          const partecipante = childSnapshot.val();
          const voti = partecipante.voti || 0;
          totaleVoti += voti;

          partecipanti.push({
            nome: partecipante.nome,
            voti: voti,
            foto: partecipante.immagineUrl || "user.jpg",
          });
        });

        partecipanti.forEach((partecipante) => {
          partecipante.percentuale = totaleVoti
            ? Math.round((partecipante.voti / totaleVoti) * 100)
            : 0;
        });

        partecipanti.sort((a, b) => a.voti - b.voti); // Ordinamento dal meno al più votato

        let classificaHtml = `
                <h1 style="text-align: center;">Classifica Finale</h1>
                <div class="classifica-container">
                    <ul>`;

        partecipanti.forEach((partecipante, index) => {
          const posizione = partecipanti.length - index;

          classificaHtml += `
                    <li class="partecipante" style="display: none;">
                        <img src="${partecipante.foto}" alt="${partecipante.nome}" class="foto-partecipante">
                        <div class="dettagli-partecipante">
                            <strong>${partecipante.nome}</strong><br>
                            <span>${partecipante.percentuale}%</span>
                        </div>
                        <div class="container-posto">
                          <div class="numero-posto">${posizione}°</div>
                        </div>
                    </li>`;
        });

        classificaHtml += "</ul></div>";

        const classificaPage = window.open("", "_blank");
        classificaPage.document.write(`
                <!DOCTYPE html>
                <html lang="it">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Classifica Finale</title>
                    <link rel="stylesheet" href="styleClassifica.css">
                    <style>
                        .partecipante {
                            transition: opacity 0.5s ease;
                        }
                        /* Container per i coriandoli */
                        .confetti {
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            pointer-events: none;
                            overflow: hidden;
                            z-index: -1;
                        }

                        /* Singolo coriandolo */
                        .confetti-piece {
                            position: absolute;
                            width: 10px;
                            height: 10px;
                            opacity: 0.8;
                            border-radius: 50%;
                            animation: caduta-confetti linear infinite;
                            animation-duration: calc(2s + 3 * var(--random)) !important;
                        }

                        /* Animazione dei coriandoli */
                        @keyframes caduta-confetti {
                            0% {
                                transform: translateY(0) rotate(0);
                                opacity: 1;
                            }
                            100% {
                                transform: translateY(100vh) rotate(360deg);
                                opacity: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                ${classificaHtml}
                <div class="confetti"></div>
                <script>
                    // Genera i coriandoli
                    function creaCoriandoli() {
                        const confettiContainer = document.querySelector(".confetti");
                        for (let i = 0; i < 100; i++) {
                            const confetto = document.createElement("div");
                            confetto.classList.add("confetti-piece");
                            confetto.style.left = \`\${Math.random() * 100}vw\`;
                            confetto.style.top = \`\${-10 + Math.random() * 5}vh\`;
                            confetto.style.backgroundColor = generaColoreCasuale();
                            confettiContainer.appendChild(confetto);
                        }
                    }

                    // Genera un colore casuale per i coriandoli
                    function generaColoreCasuale() {
                        const colori = ["#FF5733", "#FFC300", "#DAF7A6", "#FF33FF", "#33FFF9"];
                        return colori[Math.floor(Math.random() * colori.length)];
                    }

                    // Esegui la creazione dei coriandoli al caricamento della pagina
                    window.onload = creaCoriandoli;
                </script>
                </body>
                </html>
            `);

        let currentIndex = 0;

        function mostraProssimoPartecipante() {
          const partecipantiList =
            classificaPage.document.querySelectorAll(".partecipante");

          if (currentIndex < partecipantiList.length) {
            partecipantiList[currentIndex].style.display = "block";
            partecipantiList[currentIndex].style.opacity = 1;
            currentIndex++;
          }
        }

        classificaPage.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            mostraProssimoPartecipante();
          }
        });

        classificaPage.focus();
      });
}
  // Evento per il bottone della classifica
  document
    .getElementById("showRanking")
    .addEventListener("click", mostraClassifica);
});
