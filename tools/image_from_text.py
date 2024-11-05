
print("Image from text...");
print("Importing...")
import io;
import shutil;
import subprocess;
import openai
import requests;


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

def writeBinToFile(path, content):
    print("Writing to:", path);
    with open(path, "wb") as file:
        file.write(content);

def runShellCommand(bashSeq):
    subprocess.run( bashSeq );

class LewcidImageConnection:
    def __init__(self) -> None:
        self.api_key = readFileAsText("tools/keys/openai_key.txt")
        self.client = None;
        self.model_name = "dall-e-2"
        pass
    def ensureClient(self):
        if (self.client is not None):
            return self.client;
        print("Conncting...");
        self.client = openai.OpenAI(
            api_key=self.api_key,
            project='proj_onzyheCoq9dcE4nEdjGyCDYe',
        )
        #self.client.api_key = self.api_key;
        return self.client;
    def downloadFromTo(self, fromUrl, toPath):
        req = requests.get(fromUrl)
        content = req.content;
        writeBinToFile(toPath, content);
        return content;
    def generateImageToPath(self, prompt):
        self.ensureClient();
        print("Running...")
        result = self.client.images.generate(
            prompt=prompt,
            model=self.model_name,
            n=1,
            size="1024x1024"
        )
        print("Result:")
        print(result)
        image_url = result.data[0].url
        
        return image_url; #[0];


global_image_connection = LewcidImageConnection();

class LewcidImageGenerator:
    def __init__(self) -> None:
        self.input_dir = ""
        self.prompt = None;
    def generateForUnitAndPose(self,unit,pose):
        self.setSelectUnitAndPose(unit, pose);
        self.updatePrompt(pose == "prop");
        self.doGenerate();
    def doGenerate(self):
        global global_image_connection;
        conn = global_image_connection;
        src_path = conn.generateImageToPath(self.prompt);
        temp_path = "latest.png"
        conn.downloadFromTo(src_path,temp_path);
        shutil.copy(temp_path, self.out_img);
        shutil.copy(temp_path, self.out_img_raw);
        #runShellCommand(["dwebp", self.out_img_raw,"-o", self.out_img]); # dwebp image.webp -o image.png
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
        prompt_info = prompt + "\n\nmodel:" + global_image_connection.model_name + "\n";
        print("Prompt=", prompt);
        writeToFile(self.out_prompt, prompt_info);
        return desc;

gen = LewcidImageGenerator();
#gen.generateForUnitAndPose('patrol','idle');
#gen.generateForUnitAndPose('target_cell','idle');
gen.generateForUnitAndPose('cell','prop');

print("Done.")
