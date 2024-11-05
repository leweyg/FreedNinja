
print("Image from text...");
print("Importing...")
import io;
import shutil;
import subprocess;
from gradio_client import Client

def readFileAsText(path):
    print("Reading from:", path);
    res = None;
    with open(path,"r") as file:
        res = file.read();
    return res;

def writeToFile(path, content):
    print("Writing to:", path);
    with open(path, "w") as file:
        file.write(content);

def runShellCommand(bashSeq):
    subprocess.run( bashSeq );

class LewcidImageConnection:
    def __init__(self) -> None:
        self.hf_token = readFileAsText("tools/keys/hf_token.txt")
        self.client = None;
        self.model_name = "KingNish/Realtime-FLUX"
        self.model_seed = 511
        pass
    def ensureClient(self):
        if (self.client is not None):
            return self.client;
        self.client = Client(self.model_name, hf_token=self.hf_token)
        return self.client;
    def generateImageToPath(self, prompt):
        client = self.ensureClient();
        print("Running...")
        result = client.predict(
                prompt=prompt,
                seed=self.model_seed,
                width=1024,
                height=1024,
                api_name="/generate_image"
        )
        print("Result:")
        print(result)
        return result[0];

global_image_connection = LewcidImageConnection();

class LewcidImageGenerator:
    def __init__(self) -> None:
        self.input_dir = "projects/FreedNinja/"
        self.prompt = None;
    def generateForUnitAndPose(self,unit,pose):
        self.setSelectUnitAndPose(unit, pose);
        self.updatePrompt(pose == "prop");
        self.doGenerate();
    def doGenerate(self):
        global global_image_connection;
        conn = global_image_connection;
        src_path = conn.generateImageToPath(self.prompt);
        shutil.copy(src_path,"latest.webp");
        shutil.copy(src_path, self.out_img_raw);
        runShellCommand(["dwebp", self.out_img_raw,"-o", self.out_img]); # dwebp image.webp -o image.png
    def setSelectUnitAndPose(self,unit,pose):
        print("Selecting:", unit, "in pose:", pose);
        self.unit_dir = "docs/art/units/" + unit +"/"
        self.common_dir = "docs/art/common/"
        self.pose = "pose_" + pose
        self.out_img_raw = self.input_dir + self.unit_dir + self.pose + "_image_raw.webp";
        self.out_img     = self.input_dir + self.unit_dir + self.pose + "_image.png";
        self.out_prompt  = self.input_dir + self.unit_dir + self.pose + "_prompt.txt";
    def updatePrompt(self, isProp):
        typeFile = "desc_prop.txt" if isProp else "desc_sprite.txt"
        self.input_descs_paths = [
            self.input_dir +  self.unit_dir + "desc_unit.txt",
            self.input_dir + self.common_dir + "desc_" + self.pose +".txt",
            self.input_dir + self.common_dir + "desc_style.txt",
            self.input_dir + self.common_dir + typeFile ]
        desc = "";
        for desc_path in self.input_descs_paths:
            part = readFileAsText(desc_path);
            desc += part + " .\n";
        self.input_desc = desc;
        # Final prompt:
        prompt = desc;
        self.prompt = prompt;
        global global_image_connection;
        prompt_info = prompt + "\n\nmodel:" + global_image_connection.model_name + "\nseed:" + str(global_image_connection.model_seed) + "\n";
        print("Prompt=", prompt);
        writeToFile(self.out_prompt, prompt_info);
        return desc;

gen = LewcidImageGenerator();
#gen.generateForUnitAndPose('patrol','idle');
#gen.generateForUnitAndPose('target_cell','idle');
gen.generateForUnitAndPose('cell','prop');

print("Done.")
