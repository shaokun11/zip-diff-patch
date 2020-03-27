let fs = require("fs");
let jszip = require("jszip");
let oldFile = "./game_v1.8.2.zip";
let newFile = "./game_v1.9.0.zip";
let { promisify } = require("util");

(async function readAll() {
  let [res1, res2] = await Promise.all([read(newFile), read(oldFile)]);
  let [zip, oldZip] = await Promise.all([
    jszip.loadAsync(res1),
    jszip.loadAsync(res2)
  ]);
  let file2 = oldZip.files;
  Object.values(zip.files).forEach(item => {
    if (!item.dir) {
      let content = item["_data"].compressedContent;
      if (file2[item.name]) {
        let content2 = file2[item.name]["_data"].compressedContent;
        let same = Buffer.from(content).equals(content2);
        if (same) {
          zip.remove(item.name);
        }
      }
    }
  });

  zip
    .generateNodeStream({ type: "nodebuffer", streamFiles: true })
    .pipe(fs.createWriteStream("bake.zip"))
    .on("finish", function() {
      let existDirs = [];
      let existFiles = [];
      fs.readFile("bake.zip", function(err, data) {
        jszip.loadAsync(data).then(function(zip) {
          Object.values(zip.files).forEach(item => {
            if (item.dir) {
              existDirs.push(item.name);
            } else {
              existFiles.push(item.name);
            }
          });
          existFiles = existFiles.map(item =>
            item.substr(0, item.lastIndexOf("/") + 1)
          );
          existFiles = [...new Set(existFiles)];
          existDirs = existDirs.filter(item => {
            let r = true;
            for (let e of existFiles) {
              if (e.includes(item)) {
                r = false;
                break;
              }
            }
            return r;
          });
          //   console.log(existDirs);
          zip.forEach(item => {
            if (item.length > 0) {
              if (existDirs.includes(item)) {
                zip.remove(item);
              }
            }
          });
          zip
            .generateNodeStream({ type: "nodebuffer", streamFiles: true })
            .pipe(fs.createWriteStream("bake1.zip"))
            .on("finish", function() {
              fs.unlink("back.zip", function(err, res) {
                fs.rename("bake1.zip", "patch.zip", function() {});
              });
            });
        });
      });
    });
})();

function read(path) {
  return promisify(fs.readFile)(path);
}
