# PressingPro — Prototype SaaS

Ce dossier contient la version SaaS (prototype fonctionnel, testé de bout en
bout) de PressingPro. Le logiciel offline original n'a pas été réécrit :
toute l'interface et la logique métier (dépôt, retrait, casiers, stock,
clôture...) sont inchangées. Ce qui a été ajouté :

- un serveur (`backend/`) avec une vraie base de données, un compte par
  pressing et une isolation stricte des données entre pressings ;
- un module `frontend/sync.js` qui remplace l'ancienne clé de licence par
  une inscription/connexion réelle, et synchronise en tâche de fond les
  données du navigateur vers le serveur (l'app reste utilisable hors-ligne :
  elle rattrape la synchro dès que le réseau revient) ;
- un outil de migration : sur l'écran de bienvenue, un lien "J'ai déjà une
  sauvegarde JSON" permet à un client qui utilisait la version offline de
  retrouver toutes ses données dans son nouveau compte SaaS.

## Ce qui a été testé (automatiquement, avec deux navigateurs simulés)

1. Inscription d'un nouveau pressing → assistant de bienvenue → création du
   compte administrateur (PIN) → arrivée sur le dashboard.
2. Une modification faite sur l'"appareil 1" est synchronisée sur le
   serveur (badge "☁️ Synchronisé").
3. Connexion du même compte depuis un "appareil 2" (navigateur/cache vide)
   → les données (nom du pressing, employés...) sont bien récupérées
   depuis le serveur.
4. Isolation stricte : deux pressings différents ne voient jamais les
   données l'un de l'autre (vérifié directement côté serveur).
5. Import d'une sauvegarde JSON existante à l'inscription → les données
   (tickets, clients, employés) sont restaurées et synchronisées avec le
   serveur.

Scripts de test : `e2e_test.js` et `e2e_test_import.js` (nécessitent que le
backend tourne sur le port 4000 et le frontend soit servi sur le port 8080).

## Faire tourner le prototype

```
cd backend
npm install
npm start          # démarre l'API sur http://localhost:4000

# dans un autre terminal, à la racine de frontend/ :
cd frontend
python3 -m http.server 8080
# ouvrir http://localhost:8080/index.html
```

## Ce qu'il reste à faire pour un vrai lancement public

Ce prototype tourne dans un environnement de démonstration. Pour un
lancement réel, il reste :

1. **Hébergement** : déployer `backend/` sur un serveur permanent (par
   exemple Railway, Render, ou un VPS) et remplacer SQLite par PostgreSQL
   si le volume de pressings grandit. Le schéma de données a été conçu
   pour que cette migration soit directe.
2. **Domaine** : acheter un nom de domaine et le pointer vers le serveur.
3. **Sécurité** : changer la variable d'environnement
   `PRESSINGPRO_JWT_SECRET` (une vraie valeur secrète), activer HTTPS.
4. **Paiement / abonnement** : brancher un vrai prestataire de paiement une
   fois le prix et le moyen de paiement (Mobile Money ou carte) décidés.
5. **Sauvegardes serveur régulières** de la base de données.

Aucune de ces cinq étapes ne remet en cause le travail déjà fait : elles
s'ajoutent par-dessus sans toucher au code métier existant.
