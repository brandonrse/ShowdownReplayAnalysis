var typesJSON;
var pokemonJSON;
var movesJSON;
var pokemonKeys; 

var container = document.getElementsByClassName("container")[0];

//Font
var fontBold = new FontFace("Cabin Condensed-Bold", "url(fonts/CabinCondensed-Bold.ttf)");
var fontMedium = new FontFace("Cabin Condensed-Medium", "url(fonts/CabinCondensed-Medium.ttf)");
var fontRegular = new FontFace("Cabin Condensed-Regular", "url(fonts/CabinCondensed-Regular.ttf)");
var fontSemiBold = new FontFace("Cabin Condensed-SemiBold", "url(fonts/CabinCondensed-SemiBold.ttf)");

var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
})

var replayForm = document.getElementsByClassName("replay-url")[0];

var logUrl = "https://replay.pokemonshowdown.com/gen9dlc1paldeadexdraft-2014689073.log"
var log = "";

// Battle Params
var player1 = "";
var player2 = "";
var player1Avatar = "";
var player2Avatar = "";
var rules = [];
var tier = "";
var chat = [];
var P1PokemonParty = [];
var P2PokemonParty = [];
var PokemonData = {};
var teampreview = false;


replayForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  var form = e.target;
  logUrl = form[0].value + ".log";
  // fetch(logUrl, {mode: "cors"})
  fetch(logUrl, {mode: "cors"})
  .then(r => { 
    clearAll()
    return r.text() 
  })
  .then(t => {
    log = t;
    splitLog(log);
  })
  .then(() => {
    Promise.all([
      fetch("types.json")
      .then(r => r.json())
      .then(json => typesJSON = json),
      
      fetch("pokemon.json")
      .then(response => response.json())
      .then(json => pokemonJSON = json)
      .then(x => pokemonKeys = Object.keys(pokemonJSON)),
  
      fetch("moves.json")
      .then(response => response.json())
      .then(json => movesJSON = json)
    ])
    .then(() => {
      displayRules(rules);
      profiles();
      pokemon();
    });
  })
})


 

/**
 * 
 * @param {string} log 
 */
function splitLog(log) {
  let splitLog = log.split("\n");
  let turnCount = 0;
  let stealthRockSetterP1 = "";
  let stealthRockSetterP2 = "";

  for (let i = 0; i < splitLog.length; i++) {
    let splitLine = splitLog[i].split("|");
    switch (splitLine[1]) {
      case "player":
        if (splitLine.length > 3) {
          if (splitLine[2] == "p1") {
            player1 = splitLine[3];
            player1Avatar = splitLine[4];
          }
          if (splitLine[2] == "p2") {
            player2 = splitLine[3];
            player2Avatar = splitLine[4];
          }
        }
        break;
      
      case "tier":
        tier = splitLine[2];
        break;

      case "rule":
        rules.push(splitLine[2]);
        break;

      case "poke":
        if (splitLine[3] == "Genesect-*") {
        splitLine[3] = "Genesect";
      }
        if (splitLine[2] == "p1") P1PokemonParty.push(splitLine[3]);
        if (splitLine[2] == "p2") P2PokemonParty.push(splitLine[3]);
        break;

      case "teampreview":
        teampreview = true;
        break;
      
      case "turn":
        turnCount = parseInt(splitLine[2]);
        break;

      case "c":
        chat.push(["Turn " + turnCount, splitLine[2], splitLine[3]]);
        break;

      case "switch":
      case "drag":
        if (!Object.keys(PokemonData).includes(splitLine[2])) {
          if (!splitLine[3].includes("-Mega")) {
            createPokemonData(splitLine[2], splitLine[4], splitLine[3]);
          }
        }
        break;

      case "move":
        let pokemonNicknameMove = getPokemonName(splitLine[2]);
        PokemonData[pokemonNicknameMove].moves.add(splitLine[3]);
        if (splitLine[3] == "Stealth Rock") {
          if (pokemonNicknameMove.startsWith("p1")) {
            stealthRockSetterP1 = pokemonNicknameMove;
          }
          else if (pokemonNicknameMove.startsWith("p2")) {
            stealthRockSetterP2 = pokemonNicknameMove;
          }
        }
        break;

      case "-damage":
        let pokemonNicknameDmg = getPokemonName(splitLine[2]);
        PokemonData[pokemonNicknameDmg].hp = splitLine[3];

        //Life Orb
        if (splitLine.length == 5) {
          if (splitLine[4].startsWith("[from] item: ") && PokemonData[pokemonNicknameDmg].item == "") {
            PokemonData[pokemonNicknameDmg].item = splitLine[4].split("[from] item: ")[1]
          }
        }

        //TODO: Rocky Helmet
        //TODO: Poison
        //TODO: Flame Orb
        //TODO: Toxic Orb (no credit)
        //TODO: Fling/Trick/Switcheroo
        //TODO: Confusion
        //TODO: Self-inflicted Confusion (no credit)
        //TODO: Stealth Rock when another Pokemon uses Stealth Rock but fails
        //TODO: Victor & Loser

        if (splitLine[3] == "0 fnt") {
          let count = 1;
          let defeatedBy = splitLog[i-count].split("|");

          if (splitLine[4] == "[from] Stealth Rock") {
            if (splitLine[2].startsWith("p1")) { 
              PokemonData[stealthRockSetterP2].kos.add(splitLine[2]);
            }
            else if (splitLine[2].startsWith("p2")) {
              PokemonData[stealthRockSetterP1].kos.add(splitLine[2]);
            }
          }
          else if (splitLine[4] == "[from] item: Life Orb") {
            // Nothing happens
          } 
          else {
            while(defeatedBy[1] !== "move") {
              count += 1;
              defeatedBy = splitLog[i-count].split("|");
            }
            PokemonData[getPokemonName(defeatedBy[2])].kos.add(getPokemonName(splitLine[2]));
          }
        }
        break;

      case "-terastallize":
        PokemonData[splitLine[2]].tera = splitLine[3];
        break;

      case "-ability":
        let pokemonNicknameAbility = getPokemonName(splitLine[2]);
        PokemonData[pokemonNicknameAbility].ability = splitLine[3];
        break;

      case "-fieldstart":
        if (splitLine[3].startsWith("[from] ability:")) {
          let splitAbility = splitLine[3].split("[from] ability: ");
          let abilityPokemon = splitLine[4].split("[of] ");

          PokemonData[abilityPokemon[1]].ability = splitAbility[1];
        }
        break;

      case "-weather":
        if (splitLine.length > 3) {
          if (splitLine[3].startsWith("[from] ability:")) {
            let splitAbility = splitLine[3].split("[from] ability: ");
            let abilityPokemon = splitLine[4].split("[of] ");
  
            PokemonData[abilityPokemon[1]].ability = splitAbility[1];
          }
        }
        break;
      
      case "-heal":
        let pokemonNicknameHeal = getPokemonName(splitLine[2]);
        if (splitLine.length > 4) {
          if (splitLine[4].startsWith("[from] item: ")) {
            let item = splitLine[4].split("[from] item: ")[1];
            if (PokemonData[pokemonNicknameHeal].item == "") {
              PokemonData[pokemonNicknameHeal].item = item;
            }
          }
        }
        PokemonData[pokemonNicknameHeal].hp = splitLine[3];
        break;

      case "-item":
        if (splitLine.length > 4) {
          if (splitLine[4].startsWith("[from] move: Trick")) {
            let item2 = splitLine[3];
            let pokemon1 = splitLine[2];
  
            let nextLine = splitLog[i+1].split("|");
  
            let item1 = nextLine[3];
            let pokemon2 = nextLine[2];
  
            if (PokemonData[pokemon1].item == "") {
              PokemonData[pokemon1].item = item1;
            }
            if (PokemonData[pokemon2].item == "") {
              PokemonData[pokemon2].item = item2;
            }
  
            i += 1;
          }
        }
        break;

      case "-enditem":
        if (PokemonData[getPokemonName(splitLine[2])].item == "") {
          PokemonData[getPokemonName(splitLine[2])].item = splitLine[3];
        }
        break;

      case "-mega":
        if (PokemonData[getPokemonName(splitLine[2])].item == "") {
          PokemonData[getPokemonName(splitLine[2])].item = splitLine[4];
        }
        break;

      default:
        break;
    }
  };
  let pokemonFound = new Set();
  P1PokemonParty.forEach(pkmn => {
    for (const data in PokemonData) {
      if (PokemonData[data].species == pkmn) {
        pokemonFound.add(pkmn);
      }
    }
    if (!pokemonFound.has(pkmn)) {
      createPokemonData("p1: " + pkmn, "100/100", pkmn);
    }
  });

  P2PokemonParty.forEach(pkmn => {
    for (const data in PokemonData) {
      if (PokemonData[data].species == pkmn) {
        pokemonFound.add(pkmn);
      }
    }
    if (!pokemonFound.has(pkmn)) {
      createPokemonData("p2: " + pkmn, "100/100", pkmn);
    }
  });
}

function displayRules() {
  let rulesDiv = document.getElementsByClassName("rules")[0];

  let rulesCol = document.createElement("div");
  rulesCol.className = "col-6";
  
  let tierHeader = document.createElement("h2");
  tierHeader.textContent = tier;

  let rulesOl = document.createElement("ol");
  rulesOl.className = "list-group list-group-numbered";

  rules.forEach(rule => {
    let ruleLi = document.createElement("li");
    ruleLi.className = "list-group-item";
    ruleLi.textContent = rule;
    rulesOl.appendChild(ruleLi);
  });
  rulesCol.appendChild(tierHeader);
  rulesCol.appendChild(rulesOl);

  let chatCol = document.createElement("div");
  chatCol.className = "col-6";

  if (chat.length > 0) {
    let chatHeader = document.createElement("h2");
    chatHeader.textContent = "Chatlog";
    chatCol.appendChild(chatHeader);
    
    let groupDiv = document.createElement("div");
    groupDiv.className = "overflow-auto";
    
    let listGroupDiv = document.createElement("div");
    listGroupDiv.className = "list-group";
    listGroupDiv.style.maxHeight = "500px";

    chat.forEach(msg => {
      let itemHref = document.createElement("a");
      itemHref.className = "list-group-item list-group-item-action chat-message";
      itemHref.href = "#";
      
      let chatContentDiv = document.createElement("div");
      chatContentDiv.className = "d-flex w-100 justify-content-between";
      
      let chatPlayerHeading = document.createElement("h5");
      chatPlayerHeading.className = "mb-1";
      chatPlayerHeading.textContent = msg[1];

      let chatMsg = document.createElement("p");
      chatMsg.className = "mb-1";
      chatMsg.textContent = msg[2];

      let chatTurnSmall = document.createElement("small");
      chatTurnSmall.textContent = msg[0];
      chatTurnSmall.className = "text-muted";

      chatContentDiv.appendChild(chatPlayerHeading);
      chatContentDiv.appendChild(chatTurnSmall);
      itemHref.appendChild(chatContentDiv);
      itemHref.appendChild(chatMsg);
      listGroupDiv.appendChild(itemHref);

    });
    groupDiv.appendChild(listGroupDiv);
    chatCol.appendChild(groupDiv);
  }
  rulesDiv.appendChild(rulesCol);
  rulesDiv.appendChild(chatCol);
}

function profiles() {
  let profileDivs = document.getElementsByClassName("profile");
  let avatar1 = document.createElement("img");
  avatar1.src = "https://play.pokemonshowdown.com/sprites/trainers/" + avatarCheck(player1Avatar) + ".png";
  avatar1.alt = player1Avatar;
  avatar1.className = "avatar";
  
  let name1 = document.createElement("h2");
  name1.textContent = player1;
  name1.id = "trainer";

  let avatar2 = document.createElement("img");
  avatar2.src = "https://play.pokemonshowdown.com/sprites/trainers/" + avatarCheck(player2Avatar) + ".png";
  avatar2.alt = player2Avatar;
  avatar2.className = "avatar";
  
  let name2 = document.createElement("h2");
  name2.textContent = player2;
  name2.id = "trainer";

  profileDivs[0].appendChild(avatar1);
  profileDivs[0].appendChild(name1);
  profileDivs[1].appendChild(avatar2);
  profileDivs[1].appendChild(name2);
}

function avatarCheck(avatar) {
  switch (avatar) {
    case "2":
      return "dawn";

    case "37":
      return "beauty-gen4dp";

    case "159":
      return "sabrina";

    case "212":
      return "pilot";

    case "223":
      return "iris";

    case "266":
      return "nate";
  
    default:
      return avatar;
  }
}

function pokemon() {
  let party = document.getElementsByClassName("party");
  
  for (const pokemon in PokemonData) {
    pkmn = PokemonData[pokemon];

    let pokemonName = pkmn.species.split(", ")[0];

    let pokemonGender = pkmn.species.split(", ")[1];
    if (pkmn.species.split(", ")[1] != "shiny") {
      pokemonGender = pkmn.species.split(", ")[1];
    } else {
      pokemonGender = "";
    }

    let pokemonDiv = document.createElement("div");
    pokemonDiv.className = "pokemon";

    let pokemonCol = document.createElement("div");
    pokemonCol.className = "col-5";
    //Name
    let nicknameP = document.createElement("p");
    nicknameP.className = "nickname";

    if (pokemon.startsWith("p1: ")) {
      nicknameP.textContent = pokemon.split("p1: ")[1].split(", ")[0]
    }
    else if (pokemon.startsWith("p2: ")) {
      nicknameP.textContent = pokemon.split("p2: ")[1].split(", ")[0]
    }
    pokemonCol.appendChild(nicknameP);

    let species = document.createElement("p");
    species.className = "species";
    species.textContent = PokemonData[pokemon].species.split(", ")[0];
    pokemonCol.appendChild(species);

    //Image
    let pokemonImg = document.createElement("img");
    pokemonImg.src = pokemonJSON[pokemonName.toUpperCase()].icon;
    pokemonImg.alt = pokemonName;
    pokemonImg.className = "pokemon-image";
    pokemonCol.appendChild(pokemonImg);
    
    let iconRow = document.createElement("div");
    iconRow.className = "row";

    //Ability
    let pokemonAbility = document.createElement("p");
    pokemonAbility.className = "ability";
    if (pkmn.ability !== "") {
      pokemonAbility.innerText = pkmn.ability;
    }
    else {
      if (tier != "Almost Any Ability" && tier != "Balanced Hackmons" && tier != "[Gen 7] Pure Hackmons" && !tier.startsWith("[Gen 1]") && !tier.startsWith("[Gen 2]")) {
        pokemonAbility.innerText = oneAbilityCheck(pkmn.species.split(", ")[0], tier)    
      }
      else if (tier.startsWith("[Gen 1]") || tier.startsWith("[Gen 2]")) {
        pokemonAbility.innerText = "No Ability"
      }
      else {
        pokemonAbility.innerText = "??????"
      }
    }
    pokemonCol.appendChild(pokemonAbility);

    //Gender
    if (pokemonGender != "" && pokemonGender != undefined) {
      let genderCol = document.createElement("div");
      genderCol.className = "col-2";
      
      let genderImg = document.createElement("img");
      genderImg.src = pokemonGender == undefined ? "" : "./images/" + pokemonGender + ".png";
      genderImg.className = "gender-icon";
      genderImg.alt = pokemonGender == "M" ? "Male" : "Female";
      
      genderCol.appendChild(genderImg);
      iconRow.appendChild(genderCol);
    }
    // Tera Type
    if (pkmn.tera != "" && pkmn.tera != undefined) {
      let teraCol = document.createElement("div");
      teraCol.className = "col-2";

      let teraImg = document.createElement("img");
      teraImg.src = pkmn.tera = "" ? "" : "./images/types/" + pkmn.tera + " SV Tera.png";
      teraImg.alt = "Tera " + pkmn.tera;
      teraImg.className = "tera-icon"

      teraCol.appendChild(teraImg);
      iconRow.appendChild(teraCol);
    }

    // Held Item
    let formItem = pokemonFormItem(pkmn.species.split(", ")[0]);
    if (formItem !== "") {
      pkmn.item = formItem;
    }

    if (pkmn.item !== "") {

      let itemCol = document.createElement("div");
      itemCol.className = "col-2";

      let itemImg = document.createElement("img");
      itemImg.src = "./images/items/" + pkmn.item + " SV.png";
      itemImg.className = "item";
      itemImg.alt = pkmn.item;
      itemImg.setAttribute("data-bs-toggle","tooltip");
      itemImg.setAttribute("data-bs-placement","top");
      itemImg.title = pkmn.item;

      itemCol.appendChild(itemImg);
      iconRow.appendChild(itemCol);
    }
    pokemonCol.appendChild(iconRow);
    pokemonDiv.appendChild(pokemonCol);

    //Moves
    let movesDiv = document.createElement("div");
    movesDiv.className = "col-4 moves";

    let moveCount = 0;
    for (const move of pkmn.moves) {

      let moveCol = document.createElement("div");
      moveCol.className = "col-9";
  
      let moveTypeCol = document.createElement("div");
      moveTypeCol.className = "col-3";

      let moveRow = document.createElement("div");
      moveRow.className = "row move";

      let moveP = document.createElement("p");
      moveP.className = "move-text";
      moveP.textContent = move;
      
      let moveTypeImg = document.createElement("img");
      if (movesJSON[move.toUpperCase()] == undefined) {
        moveP.className  = "move-text";
        moveTypeImg.src = "./images/No Type.png";
        moveTypeImg.alt = "No Type"
        moveTypeImg.className = "icon";
      } else {
        moveP.className = "move-text " + movesJSON[move.toUpperCase()].type;
        moveTypeImg.src = "./images/types/" + movesJSON[move.toUpperCase()].type + " SV.png";
        moveTypeImg.className = "icon";
      }

      moveTypeCol.appendChild(moveTypeImg);
      moveCol.appendChild(moveP);

      moveRow.appendChild(moveTypeCol);
      moveRow.appendChild(moveCol);
      movesDiv.appendChild(moveRow);
      pokemonDiv.appendChild(movesDiv);

      moveCount += 1;
    }

    while (moveCount < 4) {
      let moveCol = document.createElement("div");
      moveCol.className = "col-9";
  
      let moveTypeCol = document.createElement("div");
      moveTypeCol.className = "col-3";

      let moveRow = document.createElement("div");
      moveRow.className = "row move";

      let moveUnknownP = document.createElement("p");
      moveUnknownP.className = "move-text";
      moveUnknownP.textContent = "????????";
      
      let moveTypeImg = document.createElement("img");
      moveTypeImg.src = "./images/No Type.png";
      moveTypeImg.alt = "No Type";
      moveTypeImg.className = "icon";

      moveTypeCol.appendChild(moveTypeImg);
      moveCol.appendChild(moveUnknownP);

      moveRow.appendChild(moveTypeCol);
      moveRow.appendChild(moveCol);
      movesDiv.appendChild(moveRow);
      pokemonDiv.appendChild(movesDiv);
      
      moveCount += 1;
    }

    let koCol = document.createElement("div");
    koCol.className = "col-3";
    let koText = document.createElement("p");
    koText.textContent = "K.O.";
    koText.className = "ko-text";
    koCol.appendChild(koText);
    koCol.appendChild(document.createElement("hr"))

    for (const ko of pkmn.kos) {
      let koPkmn = PokemonData[ko].species.split(", ")[0];
      let koImg = document.createElement("img");
      koImg.src = pokemonJSON[koPkmn.toUpperCase()].icon;
      koImg.className = "ko-image";
      koCol.appendChild(koImg);
    }

    pokemonDiv.appendChild(koCol);
    

    if (pokemon.startsWith("p1: ")) {
      party[0].appendChild(pokemonDiv);
    }
    else if (pokemon.startsWith("p2: ")) {
      party[1].appendChild(pokemonDiv);
    }
  };

}

function clearAll() {
  document.getElementsByClassName("rules")[0].innerHTML = "";
  document.getElementsByClassName("profile")[0].innerHTML = "";
  document.getElementsByClassName("profile")[1].innerHTML = "";
  document.getElementsByClassName("party")[0].innerHTML = "";
  document.getElementsByClassName("party")[1].innerHTML = "";
  player1 = "";
  player2 = "";
  player1Avatar = "";
  player2Avatar = "";
  rules = [];
  tier = "";
  chat = [];
  P1PokemonParty = [];
  P2PokemonParty = [];
  PokemonData = {};
  teampreview = false;
}

function pokemonFormItem(species) {
  switch (species) {
    case "Groudon-Primal":
      return "Red Orb";

    case "Kyogre-Primal":
      return "Blue Orb";
  
    case "Dialga-Origin":
      return "Adamant Crystal";

    case "Giratina-Origin":
      return "Griseous Core";

    case "Palkia-Origin":
      return "Lustrous Globe";

    case "Ogerpon-Cornerstone":
      return "Cornerstone Mask";
    
    case "Ogerpon-Hearthflame":
      return "Hearthflame Mask";

    case "Ogerpon-Wellspring":
      return "Wellspring Mask";

    case "Silvally-Bug":
      return "Bug Memory";

    case "Silvally-Dark":
      return "Dark Memory";

    case "Silvally-Dragon":
      return "Dragon Memory";

    case "Silvally-Electric":
      return "Electric Memory";

    case "Silvally-Fairy":
      return "Fairy Memory";

    case "Silvally-Fighting":
      return "Fighting Memory";

    case "Silvally-Fire":
      return "Fire Memory";

    case "Silvally-Flying":
      return "Flying Memory";

    case "Silvally-Ghost":
      return "Ghost Memory";

    case "Silvally-Grass":
      return "Grass Memory";

    case "Silvally-Ground":
      return "Ground Memory";

    case "Silvally-Ice":
      return "Ice Memory";

    case "Silvally-Poison":
      return "Poison Memory";

    case "Silvally-Psychic":
      return "Psychic Memory";

    case "Silvally-Rock":
      return "Rock Memory";

    case "Silvally-Steel":
      return "Steel Memory";

    case "Silvally-Water":
      return "Water Memory";

    case "Abomasnow-Mega":
      return "Abomasite";

    case "Absol-Mega":
      return "Absolite";

    case "Aerodactyl-Mega":
      return "Aerodactylite";

    case "Aggron-Mega":
      return "Aggronite";

    case "Alakazam-Mega":
      return "Alakazite";

    case "Altaria-Mega":
      return "Altarianite";

    case "Ampharos-Mega":
      return "Ampharosite";

    case "Audino-Mega":
      return "Audinite";

    case "Banette-Mega":
      return "Banettite";

    case "Beedrill-Mega":
      return "Beedrillite";

    case "Blastoise-Mega":
      return "Blastoisinite";

    case "Blaziken-Mega":
      return "Blazikenite";

    case "Charizard-Mega-X":
      return "Charizardite X";

    case "Charizard-Mega-Y":
      return "Charizardite Y";

    case "Diancie-Mega":
      return "Diancite";

    case "Gallade-Mega":
      return "Galladite";

    case "Garchomp-Mega":
      return "Garchompite";

    case "Gardevoir-Mega":
      return "Gardevoirite";

    case "Gengar-Mega":
      return "Gengarite";

    case "Glalie-Mega":
      return "Glalitite";

    case "Gyarados-Mega":
      return "Gyaradosite";

    case "Heracross-Mega":
      return "Heracronite";

    case "Houndoom-Mega":
      return "Houndoominite";

    case "Kangaskhan-Mega":
      return "Kangaskhanite";

    case "Latias-Mega":
      return "Latiasite";

    case "Latios-Mega":
      return "Latiosite";

    case "Lopunny-Mega":
      return "Loppunite";

    case "Lucario-Mega":
      return "Lucarionite";

    case "Manectric-Mega":
      return "Manectite";

    case "Mawile-Mega":
      return "Mawilite";

    case "Medicham-Mega":
      return "Medichamite";

    case "Metagross-Mega":
      return "Metagrossite";

    case "Mewtwo-Mega-X":
      return "Mewtwonite X";

    case "Mewtwo-Mega-Y":
      return "Mewtwonite Y";

    case "Pidgeot-Mega":
      return "Pidgeotite";

    case "Pinsir-Mega":
      return "Pinsirite";

    case "Sableye-Mega":
      return "Sablenite";

    case "Salamance-Mega":
      return "Salamencite";

    case "Sceptile-Mega":
      return "Sceptilite";

    case "Scizor-Mega":
      return "Scizorite";

    case "Sharpedo-Mega":
      return "Sharpedonite";

    case "Slowbro-Mega":
      return "Slowbronite";

    case "Steelix-Mega":
      return "Steelixite";

    case "Swampert-Mega":
      return "Swampertite";

    case "Tyranitar-Mega":
      return "Tyranitarite";

    case "Venusaur-Mega":
      return "Venusaurite";

    case "Zacian-Crowned":
      return "Rusted Sword";

    case "Zamazenta-Crowned":
      return "Rusted Shield";

    default:
      break;
  }
  return "";
}

function createPokemonData(nickname, hp, species) {
  let newNickname = nickname;
  let trainer = "";

  if (nickname.startsWith("p1a: ")) {
    newNickname = "p1: " + nickname.split("p1a: ")[1];
    trainer = "p1";
  }  
  else if (nickname.startsWith("p1b: ")) {
    newNickname = "p1: " + nickname.split("p1b: ")[1];
    trainer = "p1"
  }
  else if (nickname.startsWith("p2a: ")) {
    newNickname = "p2: " + nickname.split("p2a: ")[1];
    trainer = "p2"
  }
  else if (nickname.startsWith("p2b: ")) {
    newNickname = "p2: " + nickname.split("p2b: ")[1];
    trainer = "p2"
  }
  
  PokemonData[newNickname] = {};
  PokemonData[newNickname].hp = hp;
  PokemonData[newNickname].moves = new Set([]);
  PokemonData[newNickname].kos = new Set([]);
  PokemonData[newNickname].species = species;
  PokemonData[newNickname].tera = "";
  PokemonData[newNickname].ability = "";
  PokemonData[newNickname].item = "";
  PokemonData[newNickname].trainer = trainer;
  
}

function oneAbilityCheck(species, tier) {
  let ability = "";
  switch (species) {
    case "Pidgey":
    case "Pidgeotto":
    case "Pidgeot":
    case "Nidoran-F":
    case "Nidorina":
    case "Nidoqueen":
    case "Nidoran-M":
    case "Nidorino":
    case "Nidoking":
    case "Cleffa":
    case "Clefairy":
    case "Clefable":
    case "Paras":
    case "Parasect":
    case "Venonat":
    case "Venomoth":
    case "Meowth":
    case "Persian":
    case "Mankey":
    case "Primeape":
    case "Machop":
    case "Machoke":
    case "Machamp":
    case "Seel":
    case "Dewgong":
    case "Shellder":
    case "Cloyster":
    case "Drowzee":
    case "Hypno":
    case "Hitmonlee":
    case "Hitmonchan":
      if (tier.startsWith("[Gen 3]")) {
        ability = pokemonJSON[species.toUpperCase()].abilities[0];
      } else {
        ability = "??????"
      }
      break;
    
    case "Igglybuff":
    case "Jigglypuff":
    case "Wigglytuff":
      if (tier.startsWith("[Gen 3]") || tier.startsWith("[Gen 4]") || tier.startsWith("[Gen 5]")) {
        ability = pokemonJSON[species.toUpperCase()].abilities[0];
      } else {
        ability = "??????"
      }
      break;
  
    default:
      if (Object.hasOwn(pokemonJSON[species.toUpperCase()], "abilities")) {
        if (pokemonJSON[species.toUpperCase()].abilities.length == 1 && pokemonJSON[species.toUpperCase()].hiddenAbility.length == 0) {
          ability = pokemonJSON[species.toUpperCase()].abilities[0];
        }
        else {
          ability = "??????"
        }
      } 
      else {
        ability = "??????"
      }
      break;
  }
  return ability;
}

function getPokemonName(nickname) {
  let newNickname = nickname;
  if (nickname.startsWith("p1a: ")) {
    newNickname = "p1: " + nickname.split("p1a: ")[1];
  }  
  else if (nickname.startsWith("p1b: ")) {
    newNickname = "p1: " + nickname.split("p1b: ")[1];
  }
  else if (nickname.startsWith("p2a: ")) {
    newNickname = "p2: " + nickname.split("p2a: ")[1];
  }
  else if (nickname.startsWith("p2b: ")) {
    newNickname = "p2: " + nickname.split("p2b: ")[1];
  }
  return newNickname;
}