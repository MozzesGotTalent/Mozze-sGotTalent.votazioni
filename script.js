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
  if (partecipantiList) {
    db.ref("statoVotazioni").on("value", (snapshot) => {
      const stato = snapshot.val();

      if (!stato) {
        partecipantiList.innerHTML = "";
        messaggioVotazioni.textContent = "Votazioni chiuse, aspettare.";
      } else {
        messaggioVotazioni.textContent = "";
        db.ref("partecipanti").on("value", (snapshot) => {
          const partecipanti = snapshot.val();
          partecipantiList.innerHTML = "";
          if (partecipanti) {
            for (let id in partecipanti) {
              const partecipante = partecipanti[id];
              const div = document.createElement("div");
              div.className = "partecipante";
              div.innerHTML = `
                            <img src="${partecipante.immagineUrl}" alt="${partecipante.nome}" width="100" />
                            <span>${partecipante.nome}</span>
                            <button class="votaBtn" data-id="${id}">Vota</button>
                        `;
              partecipantiList.appendChild(div);
            }

            // Aggiungi event listeners per i pulsanti di voto
            document.querySelectorAll(".votaBtn").forEach((button) => {
              button.addEventListener("click", votaPartecipante);

              // Disabilita il pulsante se l'utente ha già votato
              if (localStorage.getItem("votato")) {
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

    if (!immagineFile) {
      alert("Seleziona un'immagine per il partecipante.");
      return;
    }

    const nuovoPartecipanteRef = db.ref("partecipanti").push();
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
            immagineUrl: url, // Salva l'URL dell'immagine
          });
          addPartecipanteForm.reset();
        });
      })
      .catch((error) => {
        console.error("Errore durante il caricamento dell'immagine:", error);
      });
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
    const adminPartecipantiList = document.getElementById("adminPartecipantiList");

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
            immagineUrl: partecipanti[id].immagineUrl // Assicurati di avere anche l'URL dell'immagine
        });
    }

    // Ordina i partecipanti in ordine crescente di voti
    partecipantiArray.sort((a, b) => a.voti - b.voti);

    partecipantiArray.forEach((partecipante) => {
        const li = document.createElement("li");
        li.style.transition = "all 0.5s ease"; // Animazione di transizione
        li.innerHTML = `
            <img src="${partecipante.immagineUrl}" alt="${partecipante.nome}" width="100" />
            ${partecipante.nome} - Voti: ${partecipante.voti}
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
    partecipanteRef.remove() // Rimuove il partecipante dal database
        .then(() => {
            console.log(`Partecipante ${id} rimosso con successo.`);
        })
        .catch((error) => {
            console.error("Errore durante la rimozione del partecipante:", error);
        });
}
  // Funzione per ottenere i voti e creare la classifica
  // Funzione per ottenere i voti e creare la classifica con animazione stile Eurovision
  // Funzione per ottenere i voti e creare la classifica con animazione stile Eurovision
  function mostraClassifica() {
    firebase
      .database()
      .ref("partecipanti")
      .once("value", (snapshot) => {
        const partecipanti = [];
        snapshot.forEach((childSnapshot) => {
          const partecipante = childSnapshot.val();
          partecipanti.push({
            nome: partecipante.nome,
            voti: partecipante.voti || 0,
            foto: partecipante.foto || "Screenshot 2024-10-22 at 22.17.44.jpg", // Assicurati di avere una foto per ogni partecipante
          });
        });

        // Ordina i partecipanti in base ai voti
        partecipanti.sort((a, b) => b.voti - a.voti);

        // Crea la pagina della classifica con animazione
        let classificaHtml = `
      <h1>Classifica Finale</h1>
      <div class="classifica-container">
          <ul>`;

        for (let id in partecipanti) {
          const p = partecipanti[id];
          classificaHtml += `
            <li class="partecipante">
                <img src="${p.foto}" alt="${p.nome}" class="foto-partecipante">
                <div class="dettagli-partecipante">
                    <strong>${p.nome}</strong>
                    <span>${p.voti} voti</span>
                </div>
            </li>`;
        }
        classificaHtml += "</ul></div>";
        console.log(classificaHtml);
        // Mostra la classifica nella nuova pagina
        const classificaPage = window.open("", "_blank");
        classificaPage.document.write(`
          <!DOCTYPE html>
          <html lang="it">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Classifica Finale</title>
              <link rel="stylesheet" href="styleClassifica.css">
          </head>
          <body>${classificaHtml}</body>
          </html>
      `);
      });
  }

  // Evento per il bottone della classifica
  document
    .getElementById("showRanking")
    .addEventListener("click", mostraClassifica);
});
