
print("Image in-fill from mask text...");
print("Importing...")
import io;
import shutil;
import subprocess;
import openai;
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
    def generateInfillFromMaskToPath(self, mainImgPath, maskImgPath, prompt):
        self.ensureClient();
        print("Running...")
        result = self.client.images.edit(
            model=self.model_name,
            image=open(mainImgPath, "rb"),
            mask=open(maskImgPath, "rb"),
            prompt=prompt,
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
        self.input_dir = "" # assume root of git
        self.prompt = None;
    def generateForLevelAndView(self,level,view):
        for stepIndex in range(2):
            self.setSelectLevelAndView(level, view, stepIndex);
            self.updatePrompt();
            self.doGenerate();
    def doGenerate(self):
        global global_image_connection;
        conn = global_image_connection;
        src_path = conn.generateInfillFromMaskToPath(self.in_img_main, self.in_img_mask, self.prompt)
        conn.downloadFromTo(src_path, self.out_img);
        #shutil.copy(src_path,"latest.webp");
        #shutil.copy(src_path, self.out_img);
        #runShellCommand(["dwebp", self.out_img,"-o", self.out_img]); # dwebp image.webp -o image.png
    def setSelectLevelAndView(self,level,view, stepIndex):
        print("Selecting:", level, "in view:", view);
        self.unit_dir = "docs/art/levels/" + level +"/" + view + "/"
        self.common_dir = "docs/art/common/"
        self.pose = view
        if (stepIndex == 0):
            self.in_img_main = self.input_dir + self.unit_dir + "main.png";
            self.in_img_mask = self.input_dir + self.unit_dir + "mask.png";
            self.out_img     = self.input_dir + self.unit_dir + "background.png";
        else:
            self.in_img_main = self.input_dir + self.unit_dir + "background.png";
            self.in_img_mask = self.input_dir + self.unit_dir + "mask_inv.png";
            self.out_img     = self.input_dir + self.unit_dir + "background_2.png";
        self.out_prompt  = self.input_dir + self.unit_dir + "prompt.txt";
    def updatePrompt(self):
        self.input_descs_paths = [
            self.input_dir +  self.unit_dir + "../desc_level.txt",
            self.input_dir +  self.unit_dir + "desc_view.txt",
            self.input_dir + self.common_dir + "desc_style.txt",
            self.input_dir + self.common_dir + "desc_background.txt" ]
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
gen.generateForLevelAndView('level3','view0')


print("Done.");
