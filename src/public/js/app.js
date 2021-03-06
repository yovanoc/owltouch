import { ipcRenderer } from "electron";
import L from "leaflet";
import items from "./data/json/d2o/Items.json";
import { itemsBank } from "./public/js/plugins/htmlElementInstance";
import loadScript from "./public/js/plugins/loadPath";
import {
    bankLayerGroup,
    dofusCoordsToGeoCoords,
    drawDofusMapBoundsOnMouseMove,
    geoCoordsToDofusCoords,
    highlightSubArea,
    map,
    phoenixLayerGroup
} from "./public/js/plugins/map";
import {
    checkIfMapAlreadyExist,
    deleteAction,
    generateScript,
    getIdOfAutoComplete,
    icon,
    movementType,
    onMapClick,
    resizeMarker
} from "./public/js/plugins/pathMaker";

const sizeOf = require("image-size");
const { dialog } = require("electron").remote;
const fs = require("fs");
const path = require("path");

map.on("mousemove", e => {
    drawDofusMapBoundsOnMouseMove(e);
    highlightSubArea(e);
});

map.on("click", e => {
    onMapClick(geoCoordsToDofusCoords(e.latlng));
});

map.on("zoom", () => {
    resizeMarker();
});

function deleteAll() {
    Object.keys(movementType).forEach(key => {
        const dataTypeBackup = movementType[key].slice(0);
        movementType[key].forEach(index => {
            icon.move.forEach(name => {
                deleteAction(dataTypeBackup, index, name);
            });
        });
        movementType[key] = dataTypeBackup.slice(0);
    });
    console.log(movementType);
}

ipcRenderer.on("newFile", () => {
    const rep = confirm("Voulez vous vraiment créer un nouveau trajet et supprimer toute les actions présente sur la map ?");
    if (rep) {
        deleteAll();
    }
});

ipcRenderer.on("saveFile", () => {
    const config = {
        name: document.querySelector("#scriptName").value,
        type: document.querySelector("#scriptType").value,
        area: document.querySelector("#scriptArea").value
    };
    dialog.showSaveDialog(
        {
            filters: [{ name: "JavaScript", extensions: ["js"] }],
            defaultPath: `${config.name} [${config.area}][${config.type}]`
        },
        filename => {
            if (filename) {
                fs.writeFile(filename, generateScript(), err => {
                    if (err) throw err;
                    console.log(`${filename} Saved!`);
                });
            }
        }
    );
});

ipcRenderer.on("openFile", () => {
    dialog.showOpenDialog(
        {
            filters: [{ name: "JavaScript", extensions: ["js"] }],
            properties: ["openFile"]
        },
        filename => {
            fs.readFile(filename[0], (err, data) => {
                if (err) throw err;
                deleteAll();
                loadScript(data.toString("utf8"));
            });
        }
    );
});

function bpDefineCoord(coordElementId, type, data) {
    const coord = $(coordElementId).data("coord");
    const index = checkIfMapAlreadyExist([coord[0], coord[1]], movementType[type]);
    const marker = L.marker(dofusCoordsToGeoCoords([coord[0], coord[1]]), {
        icon: L.icon({
            iconUrl: path.join(__dirname, `./data/assets/path/${type}/${type}.png`),
            iconAnchor: [
                sizeOf(path.join(__dirname, `./data/assets/path/${type}/${type}.png`)).width / 2,
                sizeOf(path.join(__dirname, `./data/assets/path/${type}/${type}.png`)).height / 2
            ],
            className: type
        }),
        zIndexOffset: 10000,
        interactive: false
    });
    if (index !== null) {
        if (index.data[type]) {
            deleteAction(movementType[type], index, type);
        } else {
            index.data[type] = data;
            index.marker[type] = marker.addTo(map);
        }
    } else {
        movementType[type].push({
            coord: [coord[0], coord[1]],
            data: {
                [type]: data
            },
            marker: {
                [type]: marker.addTo(map)
            }
        });
    }
}

$("#defineBankCoordConfirm").on("click", () => {
    bpDefineCoord("#defineBankCoord", "bank", {
        bank: true,
        mapIdOutSide: $("#mapIdOutSide").val(),
        doorIdOutSide: $("#doorIdOutSide").val(),
        mapIdInSide: $("#mapIdInSide").val(),
        sunIdInside: $("#sunIdInside").val()
    });
});

$("#definePhoenixCoordConfirm").on("click", () => {
    bpDefineCoord("#definePhoenixCoord", "phoenix", {
        phoenix: true,
        phoenixCellid: $("#phoenixCellid").val(),
        actionAfterRevive: $("#actionAfterRevive")[0].selectedOptions[0].dataset.direction
    });
});

$("#phoenixPlacement").on("click", e => {
    $(e.currentTarget).toggleClass("selected");
    if ($(e.currentTarget).hasClass("selected")) {
        bankLayerGroup.remove();
        phoenixLayerGroup.addTo(map);
        for (const key of ["top", "bottom", "left", "right", "delete", "bankPlacement"]) {
            $(`#${key}`).removeClass("selected");
        }
    } else {
        phoenixLayerGroup.remove();
    }
});

$("#bankPlacement").on("click", e => {
    $(e.currentTarget).toggleClass("selected");
    if ($(e.currentTarget).hasClass("selected")) {
        phoenixLayerGroup.remove();
        bankLayerGroup.addTo(map);
        for (const key of ["top", "bottom", "left", "right", "delete", "phoenixPlacement"]) {
            $(`#${key}`).removeClass("selected");
        }
    } else {
        bankLayerGroup.remove();
    }
});

$("#delete").on("click", e => {
    $(e.currentTarget).toggleClass("selected");
    if ($(e.currentTarget).hasClass("selected")) {
        phoenixLayerGroup.remove();
        bankLayerGroup.remove();
        for (const key of ["top", "bottom", "left", "right", "phoenixPlacement", "bankPlacement"]) {
            $(`#${key}`).removeClass("selected");
        }
    }
});

$("#top, #bottom, #left, #right").on("click", e => {
    $(e.currentTarget).toggleClass("selected");
    if ($(e.currentTarget).hasClass("selected")) {
        phoenixLayerGroup.remove();
        bankLayerGroup.remove();
        for (const key of ["delete", "phoenixPlacement", "bankPlacement"]) {
            $(`#${key}`).removeClass("selected");
        }
    }
});

$("#addPutItem").on("click", () => {
    $(".delete-item").off();
    const name = $("#putItemName").val();
    const ids = getIdOfAutoComplete(name, items);
    const quant = $("#putItemQuant").val();
    if (name.length > 0) {
        const html = `<tr>
    <td><img src="https://ankama.akamaized.net/games/dofus-tablette/assets/2.22.1/gfx/items/${ids.iconId}.png" width="40" height="40"/></td>
    <td>${name}</td>
    <td>${quant}</td>
    <td><a class="waves-effect waves-light btn amber accent-3 delete-item" data-id="${ids.id}">X</a></td>
    </tr>`;
        itemsBank.put.push({
            item: ids.id,
            quantity: quant
        });
        console.log(itemsBank.put);
        $("#putItemTable").append(html);
        $(".delete-item").on("click", e => {
            itemsBank.put.splice(itemsBank.put.indexOf(parseInt({ item: e.target.dataset.id }, 10)), 1);
            console.log(itemsBank.put);
            $(e.target.parentNode.parentNode).remove();
        });
    }
});

$("#addGetItem").on("click", () => {
    $(".delete-item").off();
    const name = $("#getItemName").val();
    const ids = getIdOfAutoComplete(name, items);
    const quant = $("#getItemQuant").val();
    if (name.length > 0) {
        const html = `<tr>
    <td><img src="https://ankama.akamaized.net/games/dofus-tablette/assets/2.22.1/gfx/items/${ids.iconId}.png" width="40" height="40"/></td>
    <td>${name}</td>
    <td>${quant}</td>
    <td><a class="waves-effect waves-light btn amber accent-3 delete-item" data-id="${ids.id}">X</a></td>
    </tr>`;
        itemsBank.get.push({
            item: ids.id,
            quantity: quant
        });
        console.log(itemsBank.get);
        $("#getItemTable").append(html);
        $(".delete-item").on("click", e => {
            itemsBank.get.splice(itemsBank.get.indexOf(parseInt({ item: e.target.dataset.id }, 10)), 1);
            console.log(itemsBank.get);
            $(e.target.parentNode.parentNode).remove();
        });
    }
});
