# MINEVOX

Druhá verze jednoduché browserové mining hry.

## Struktura

```text
minevox/
├── index.html
├── style.css
├── script.js
├── README.md
└── assets/
    └── favicon.ico
```

## Spuštění

Otevři `index.html` v moderním webovém prohlížeči.

Není potřeba server ani instalace balíčků.

## Co je nové ve V2

### Lobby

Po spuštění hry se hráč nejdříve dostane do lobby.

V lobby si může:
- nastavit jméno hráče
- vybrat vzhled krumpáče
- vstoupit do dolu

### Postupné odhalování mapy

Celá mapa už není okamžitě odhalená.

Na začátku je odhalených pouze několik prostředních políček.

Když hráč vytěží blok, odhalí se jeho sousední políčka.

Díky tomu se důl postupně rozšiřuje a hráč nevidí dopředu, co ho čeká.

### Těžení

- 5×5 grid
- HP bloků
- Stone, Coal, Gold, Diamond a Ruby
- mince za vytěžení
- náhodné nové bloky
- upgrady krumpáče
- sbírka materiálů
- level

### Ukládání

Postup se automaticky ukládá do `localStorage`.

## Další plánované updaty

1. další doly
2. více typů bloků
3. větší mapy
4. boss bloky
5. pets
6. rebirth
7. daily rewards
8. leaderboard
9. účty hráčů
10. online multiplayer
