const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { resolve } = path;
const os = require('os');

// --- Configuration ---
const VENV_DIR_NAME = 'PDFKits'; // Name of your virtual environment directory
const PACKAGE_NAME = 'pikepdf'; // The Python package to check/install

// --- Functions ---

/**
 * Executes a shell command and returns a Promise.
 * @param {string} command The command to execute.
 * @param {object} options Options for child_process.exec.
 * @returns {Promise<string>} The stdout of the command.
 */
function runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
        // Ensure PYTHONIOENCODING is set to UTF-8
        const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };

        exec(command, { maxBuffer: 1024 * 1024 * 5, encoding: 'utf8', env, ...options }, (error, stdout, stderr) => { // 增加到5MB
            if (error) {
                console.error(`Command failed: ${command}`);
                console.error(`Error: ${error.message}`);
                if (stderr) console.error(`Stderr: ${stderr}`);
                return reject(error);
            }
            if (stderr) {
                console.warn(`Command had stderr: ${command}`);
                console.warn(`Stderr: ${stderr}`);
            }
            resolve(stdout.trim());
        });
    });
}


/**
 * Checks if Python 3 is installed and returns the executable path.
 * @returns {Promise<string|null>} Path to python3 executable or null if not found.
 */
async function checkPython3() {
    console.log('Checking for Python 3...');
    try {
        const pythonVersion = await runCommand('python3 --version');
        if (pythonVersion.includes('Python 3.')) {
            console.log(`Python 3 found: ${pythonVersion}`);
            return 'python3'; // Assuming 'python3' is in PATH
        }
    } catch (error) {
        console.warn('`python3` command not found or failed. Trying `python`.');
    }

    try {
        const pythonVersion = await runCommand('python --version');
        if (pythonVersion.includes('Python 3.')) {
            console.log(`Python 3 found (using 'python'): ${pythonVersion}`);
            return 'python'; // Assuming 'python' is in PATH and points to Python 3
        }
    } catch (error) {
        console.error('Neither `python3` nor `python` (pointing to Python 3) found. Please ensure Python 3 is installed and in your PATH.');
        return null;
    }
    return null;
}

/**
 * Determines the virtual environment base path based on the OS.
 * @returns {string} The path for the virtual environment.
 */
function getVenvBasePath() {
    let baseDir;
    switch (os.platform()) {
        case 'win32':
            baseDir = path.join(os.tmpdir(), 'nodejs_pyvenv');
            break;
        case 'darwin': // macOS
        case 'linux':
            baseDir = path.join('/tmp', 'nodejs_pyvenv');
            break;
        default:
            console.warn('Unsupported OS, using current working directory for virtual environment.');
            baseDir = path.join(__dirname, 'nodejs_pyvenv');
    }
    return baseDir;
}

/**
 * Ensures the virtual environment directory exists and returns its full path.
 * @param {string} venvBasePath The base path for the virtual environment.
 * @returns {string} The full path to the virtual environment.
 */
function getVenvFullPath(venvBasePath) {
    const venvFullPath = path.join(venvBasePath, VENV_DIR_NAME);
    if (!fs.existsSync(venvFullPath)) {
        console.log(`Creating virtual environment directory: ${venvFullPath}`);
        fs.mkdirSync(venvFullPath, { recursive: true });
    }
    return venvFullPath;
}

/**
 * Creates a virtual environment if it doesn't exist.
 * @param {string} pythonExecutable The path to the Python 3 executable.
 * @param {string} venvFullPath The full path where the virtual environment should be created.
 * @returns {Promise<void>}
 */
async function createVenv(pythonExecutable, venvFullPath) {
    const venvPythonPath = os.platform() === 'win32'
        ? path.join(venvFullPath, 'Scripts', 'python.exe')
        : path.join(venvFullPath, 'bin', 'python');

    if (fs.existsSync(venvPythonPath)) {
        console.log(`Virtual environment already exists at: ${venvFullPath}`);
        return;
    }

    console.log(`Creating virtual environment at: ${venvFullPath}`);
    await runCommand(`${pythonExecutable} -m venv "${venvFullPath}"`);
    console.log('Virtual environment created successfully.');
}

/**
 * Checks if a Python package is installed in the virtual environment.
 * @param {string} venvPythonPath The path to the Python executable within the virtual environment.
 * @param {string} packageName The name of the package to check.
 * @returns {Promise<boolean>} True if the package is installed, false otherwise.
 */
async function isPackageInstalled(venvPythonPath, packageName) {
    try {
        const output = await runCommand(`"${venvPythonPath}" -m pip show ${packageName}`);
        return output.includes(`Name: ${packageName}`);
    } catch (error) {
        return false; // pip show will return an error if the package is not found
    }
}

/**
 * Installs a Python package in the virtual environment.
 * @param {string} venvPythonPath The path to the Python executable within the virtual environment.
 * @param {string} packageName The name of the package to install.
 * @returns {Promise<void>}
 */
async function installPackage(venvPythonPath, packageName) {
    console.log(`Installing ${packageName} in the virtual environment...`);
    await runCommand(`"${venvPythonPath}" -m pip install ${packageName}`);
    console.log(`${packageName} installed successfully.`);
}

/**
 * Runs Python code from a string within the virtual environment.
 * @param {string} venvPythonPath The path to the Python executable within the virtual environment.
 * @param {string} pythonCode The Python code snippet to execute.
 * @param {string[]} args 命令行参数数组
 * @returns {Promise<string>} The stdout of the Python code execution.
 */
async function runPythonCode(venvPythonPath, pythonCode, args = []) {
    console.log('Running Python code from string...');
    
    // 1. 创建临时文件保存Python代码
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `temp_script_${Date.now()}.py`);
    fs.writeFileSync(tempFilePath, pythonCode, 'utf8');
    console.log(`Temporary script created at: ${tempFilePath}`);
    
    try {
        // 2. 构建执行命令（参数独立传递）
        const command = [
            `"${venvPythonPath}"`,
            `"${tempFilePath}"`,
            ...args.map(arg => `"${arg}"`)
        ].join(' ');
        
        console.log(`Executing: ${command}`);
        const output = await runCommand(command);
        
        console.log('Python script output:');
        console.log(output);
        return output;
    } finally {
        // 3. 清理临时文件
        try {
            fs.unlinkSync(tempFilePath);
            console.log(`Temporary file deleted: ${tempFilePath}`);
        } catch (cleanupError) {
            console.error('Failed to delete temporary file:', cleanupError);
        }
    }
}

const PAGE_LABEL = 'PAGE_LABEL'
const BOOKMARK = 'BOOKMARK'
const PYTHON_SNIPPET = {
    [PAGE_LABEL]: 
`# -*- coding: utf-8 -*-
import pikepdf
from pikepdf import Name, Dictionary, Array
import argparse
import os # Import os module for file path operations

def set_custom_page_labels(input_pdf_path, output_pdf_path, toc_page_index, start_index_page_index):
    """
    Modifies the page labels of a PDF.

    Args:
        input_pdf_path (str): Path to the input PDF file.
        output_pdf_path (str): Path to the output PDF file.
        toc_page_index (int): 0-based index of the page where uppercase Roman numerals should start.
        start_index_page_index (int): 0-based index of the page where Arabic numerals should start.
    """
    if not os.path.exists(input_pdf_path):
        print(f"Error: Input file '{input_pdf_path}' does not exist.")
        return

    try:
        with pikepdf.open(input_pdf_path) as pdf:
            num_pages = len(pdf.pages)

            # Create the /Nums array to define page label rules
            nums_array = Array()

            # Rule 1: Start with Latin alphabet from page 0
            nums_array.append(0)
            nums_array.append(Dictionary(S=Name.A)) # /S /A means Latin alphabet

            # Rule 2: Start with uppercase Roman numerals from toc_page_index
            if 0 <= toc_page_index < num_pages:
                if toc_page_index > 0: # Avoid conflict with the preceding page 0 rule
                    nums_array.append(toc_page_index)
                    nums_array.append(Dictionary(S=Name.R)) # /S /R means uppercase Roman numerals
            else:
                print(f"Warning: 'TOC' page index ({toc_page_index}) is out of valid range [0, {num_pages-1}], this rule will be ignored.")


            # Rule 3: Start with Arabic numerals from start_index_page_index
            if 0 <= start_index_page_index < num_pages:
                if start_index_page_index > 0 and start_index_page_index != toc_page_index: # Avoid conflict with previous rules
                    nums_array.append(start_index_page_index)
                    nums_array.append(Dictionary(S=Name.D)) # /S /D means Arabic numerals
                elif start_index_page_index == toc_page_index:
                    print(f"Warning: 'startindex' page index ({start_index_page_index}) is the same as 'TOC' index, this might lead to unexpected behavior. Please check.")
            else:
                print(f"Warning: 'startindex' page index ({start_index_page_index}) is out of valid range [0, {num_pages-1}], this rule will be ignored.")


            # Create the /PageLabels dictionary
            page_labels_dict = Dictionary(Nums=nums_array)

            # Add the /PageLabels dictionary to the PDF's Catalog
            pdf.Root.PageLabels = page_labels_dict

            # Save the modified PDF
            pdf.save(output_pdf_path)
        print(f"PDF page labels successfully modified and saved to: {output_pdf_path}")
    except Exception as e:
        print(f"An error occurred while processing the PDF: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Modify PDF page labels, supporting Roman letters, Roman numerals, and Arabic numerals from specified pages."
    )
    parser.add_argument(
        "input_pdf",
        help="Path to the input PDF file."
    )
    parser.add_argument(
        "output_pdf",
        help="Path to the output modified PDF file."
    )
    parser.add_argument(
        "--toc",
        type=int,
        default=-1, # Default to an impossible index, indicating this rule is not enabled
        help="0-based index of the page where uppercase Roman numerals should start. If not specified or negative, this rule is not enabled.",
    )
    parser.add_argument(
        "--startindex",
        type=int,
        default=-1, # Default to an impossible index, indicating this rule is not enabled
        help="0-based index of the page where Arabic numerals should start. If not specified or negative, this rule is not enabled.",
    )

    args = parser.parse_args()

    # Use arguments only if they are explicitly provided and non-negative
    toc_idx = args.toc if args.toc >= 0 else -1
    start_idx = args.startindex if args.startindex >= 0 else -1

    set_custom_page_labels(args.input_pdf, args.output_pdf, toc_idx, start_idx)
`,
    [BOOKMARK]:
`# -*- coding: utf-8 -*-
import pikepdf
import sys
import os

def find_base_page_from_page_labels(pdf):
    """
    查找 PDF 的 /PageLabels 字典中，/S 键值为 /D (Decimal) 的起始页码。
    这个页码将作为下面添加书签时页码的基准页 (零基)。

    Args:
        pdf_path (str): 输入 PDF 文件的路径。

    Returns:
        int: 找到的基准页码 (零基)，如果未找到则返回 0。
    """
    try:
        if '/PageLabels' in pdf.Root:
            page_labels = pdf.Root['/PageLabels']

            if '/Nums' in page_labels:
                nums_array = page_labels['/Nums']
                
                for i in range(0, len(nums_array), 2):
                    start_page_index = nums_array[i]
                    label_dict = nums_array[i+1]
                    
                    if '/S' in label_dict and label_dict['/S'] == '/D':
                        print(f"Found base page from /PageLabels with /S: /D at zero-based index: {start_page_index}")
                        return int(start_page_index)
            else:
                print("No /Nums array found in /PageLabels dictionary.")
        else:
            print("No /PageLabels dictionary found in PDF root.")

    except pikepdf.PdfError as e:
        print(f"Error opening PDF file {pdf_path} to find base page: {e}")
    except Exception as e:
        print(f"An unexpected error occurred while searching for base page from /PageLabels: {e}")
    
    print("Could not find a base page from /PageLabels with /S: /D. Defaulting to 0.")
    return 0

def create_pdf_bookmarks_from_toc(pdf_path, toc_file_path, output_path):
    """
    根据文本文件中的目录信息创建 PDF 书签。

    Args:
        pdf_path (str): 输入 PDF 文件的路径。
        toc_file_path (str): 包含目录信息的文本文件的路径。
        output_path (str): 输出 PDF 文件的路径，将保存带有新书签的 PDF。
    """
    try:
        pdf = pikepdf.Pdf.open(pdf_path)
        total_pdf_pages = len(pdf.pages) # 获取PDF的总页数
        print(f"Total pages in PDF: {total_pdf_pages}")
    except pikepdf.PdfError as e:
        print(f"Error opening PDF file {pdf_path}: {e}")
        return

    base_page_offset = find_base_page_from_page_labels(pdf)

    outline_stack = [(0, None)]

    with pdf.open_outline() as outline:
        outline.root.clear()

        try:
            with open(toc_file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip('\\n')
                    if not line:
                        continue

                    indent_level = 0
                    while line.startswith('\\t'):
                        indent_level += 1
                        line = line[1:]

                    parts = line.rsplit('\\t', 1)
                    if len(parts) != 2:
                        print(f"Skipping malformed line: '{line}' in {toc_file_path}")
                        continue

                    title, page_str = parts[0], parts[1]
                    
                    actual_zero_based_page_number = None # 默认页码为空

                    try:
                        toc_page_num_1_based = int(page_str)
                        
                        if toc_page_num_1_based <= 0:
                            print(f"Warning: Page number for '{title}' is non-positive ({toc_page_num_1_based}). Setting destination to null.")
                            # 页码小于等于0，设置为None
                            actual_zero_based_page_number = None
                        else:
                            calculated_page = (toc_page_num_1_based - 1) + base_page_offset
                            
                            # 检查计算出的页码是否在有效范围内
                            if 0 <= calculated_page < total_pdf_pages:
                                actual_zero_based_page_number = calculated_page
                            else:
                                print(f"Warning: Page number for '{title}' ({toc_page_num_1_based}) maps to physical page {calculated_page}, which is out of bounds (0-{total_pdf_pages-1}). Setting destination to null.")
                                actual_zero_based_page_number = None

                    except ValueError:
                        print(f"Warning: Invalid page number format for '{title}' ('{page_str}'). Setting destination to null.")
                        actual_zero_based_page_number = None

                    # 如果actual_zero_based_page_number为None，OutlineItem将没有目标页
                    if actual_zero_based_page_number is not None:
                        new_item = pikepdf.OutlineItem(title, actual_zero_based_page_number)
                    else:
                        # 创建没有目标页的OutlineItem
                        new_item = pikepdf.OutlineItem(title) 
                        # 可以选择设置其destination为None或者不设置，pikepdf默认会处理
                        # new_item.destination = None 

                    while outline_stack and outline_stack[-1][0] >= indent_level:
                        outline_stack.pop()

                    if not outline_stack:
                        print(f"Warning: Indent level too high or malformed TOC near '{title}'. Appending to root.")
                        outline.root.append(new_item)
                        outline_stack.append((indent_level, new_item))
                    else:
                        parent_indent, parent_item = outline_stack[-1]
                        if parent_item is None:
                            outline.root.append(new_item)
                        else:
                            parent_item.children.append(new_item)
                        outline_stack.append((indent_level, new_item))

        except FileNotFoundError:
            print(f"Error: TOC file not found at {toc_file_path}")
            return
        except Exception as e:
            print(f"Error reading or parsing TOC file {toc_file_path}: {e}")
            return

    try:
        pdf.save(output_path)
        print(f"Successfully created bookmarks and saved to {output_path}")
    except pikepdf.PdfError as e:
        print(f"Error saving PDF file to {output_path}: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python script.py <input_pdf_path> <toc_file_path> <output_pdf_path>")
        sys.exit(1)

    input_pdf_path = sys.argv[1]
    toc_file_path = sys.argv[2]
    output_pdf_path = sys.argv[3]

    create_pdf_bookmarks_from_toc(input_pdf_path, toc_file_path, output_pdf_path)
`
}

function processRestArray(rest) {
  if (!Array.isArray(rest)) {
    throw new Error("Input must be an array.");
  }

  let flag;
  let processedRest;

  if (rest.length === 1) {
    flag = BOOKMARK;
    processedRest = resolve(rest[0]); // Resolve the value and remove array structure
  } else if (rest.length === 2) {
    const parsedValues = rest.map(value => parseInt(value, 10));

    if (parsedValues.some(isNaN)) {
      throw new Error("Both values in the array must be valid numbers for PAGE_LABEL flag.");
    }

    parsedValues[0] = `--toc=${ parsedValues[0] - 1 }`
    parsedValues[1] = `--startindex=${ parsedValues[1] - 1 }`

    flag = PAGE_LABEL;
    processedRest = parsedValues;
  } else {
    // Handle cases where array length is not 1 or 2, or you can throw an error
    // For now, let's just set flag to null and keep rest as is
    flag = null;
    processedRest = rest;
  }

  return { flag: flag, rest: [].concat(processedRest) };
}

// --- Main Execution Flow ---
async function main (input, output, rest) {
    const { flag, rest: processedRest } = processRestArray(rest)
    if (flag === null) {
        console.error('Unsupported rest');
        process.exit(1);
    }
    try {
        // 1. Confirm Python 3 existence
        const pythonExecutable = await checkPython3();
        if (!pythonExecutable) {
            console.error('Aborting: Python 3 is not found or not correctly configured.');
            process.exit(1);
        }

        // 2. Determine temporary directory for virtual environment
        const venvBasePath = getVenvBasePath();
        console.log(`Virtual environment base path: ${venvBasePath}`);

        // 3. Create/Verify virtual environment
        const venvFullPath = getVenvFullPath(venvBasePath);
        await createVenv(pythonExecutable, venvFullPath);

        // Determine the Python executable path within the virtual environment
        const venvPythonPath = os.platform() === 'win32'
            ? path.join(venvFullPath, 'Scripts', 'python.exe')
            : path.join(venvFullPath, 'bin', 'python');

        // 4. Check and install pikepdf
        const pikepdfInstalled = await isPackageInstalled(venvPythonPath, PACKAGE_NAME);
        if (!pikepdfInstalled) {
            await installPackage(venvPythonPath, PACKAGE_NAME);
        } else {
            console.log(`${PACKAGE_NAME} is already installed in the virtual environment.`);
        }

        // 5. Run Python code snippet
        const pythonCodeToRun = PYTHON_SNIPPET[flag];

        await runPythonCode(
            venvPythonPath, 
            pythonCodeToRun,
            [
                resolve(input),
                ...processedRest,
                resolve(output),
            ]
        );

    } catch (error) {
        console.error('An error occurred during the process:', error);
        process.exit(1);
    }
}

module.exports = main