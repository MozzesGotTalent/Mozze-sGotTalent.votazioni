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

            // Add event listeners for voting buttons
            document.querySelectorAll(".votaBtn").forEach((button) => {
              button.addEventListener("click", votaPartecipante);
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
    const immagineRef = storage.ref(`immaginiPartecipanti/${nuovoPartecipanteRef.key}-${immagineFile.name}`);

    // Carica l'immagine su Firebase Storage
    immagineRef.put(immagineFile).then((snapshot) => {
      snapshot.ref.getDownloadURL().then((url) => {
        // Salva il partecipante con l'URL dell'immagine nel database
        nuovoPartecipanteRef.set({
          nome: nome,
          voti: 0,
          immagineUrl: url, // Salva l'URL dell'immagine
        });
        addPartecipanteForm.reset();
      });
    }).catch((error) => {
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

    // Check if user has already voted
    if (localStorage.getItem("votato")) {
      alert("Hai già votato.");
      return;
    }

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
          localStorage.setItem("votato", id); // Set flag to prevent multiple votes
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
      });
    }

    // Ordina i partecipanti in ordine crescente di voti
    partecipantiArray.sort((a, b) => a.voti - b.voti);

    partecipantiArray.forEach((partecipante) => {
      const li = document.createElement("li");
      li.style.transition = "all 0.5s ease"; // Animazione di transizione
      li.innerHTML = `
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
    partecipanteRef.remove(); // Rimuove il partecipante dal database
  }
});
