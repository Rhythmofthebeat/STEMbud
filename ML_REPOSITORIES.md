# Local ML integrations

All ten Git repositories discovered inside the three saved project folders now contain `ml_workbench`. The non-Git Resume Tools project and Boli subproject also have the workbench from the earlier integration.

| Repository/project | Example task | Guide |
| --- | --- | --- |
| replitprojectzip / STEMMY | STEM topics | [Guide](ml_workbench/README.md) |
| Avants Recruiting | Job departments | [Guide](../Startup%20Mercor%20Competitior/ml_workbench/README.md) |
| STEMbud | STEM topics | [Guide](../Startup%20Mercor%20Competitior/STEMbud/ml_workbench/README.md) |
| i-Pledge | Sustainability actions | [Guide](../Startup%20Mercor%20Competitior/i-pledge-carbon-platform/ml_workbench/README.md) |
| KR3 Asset Tracker Demo | Asset support categories | [Guide](../Startup%20Mercor%20Competitior/KR3-Asset-Tracker-Demo/ml_workbench/README.md) |
| LaptopTracker | Laptop support categories | [Guide](../Startup%20Mercor%20Competitior/LaptopTracker/ml_workbench/README.md) |
| NITJAA | Career departments | [Guide](../Startup%20Mercor%20Competitior/NITJAA/ml_workbench/README.md) |
| AI Literacy | AI lesson topics | [Guide](../Startup%20Mercor%20Competitior/AILiteracy/ml_workbench/README.md) |
| Minorities in STEM Tutoring | Tutoring subjects | [Guide](../Startup%20Mercor%20Competitior/MinoritiesInSTEM-Tutoring/ml_workbench/README.md) |
| Portfolio | Project categories | [Guide](../Startup%20Mercor%20Competitior/Portfolio/ml_workbench/README.md) |
| Avants Resume Tools (non-Git) | Resume sections | [Guide](../Resume-main%204/ml_workbench/README.md) |
| Boli (subproject) | Transcript topics | [Guide](hindi-english-translator/ml_workbench/README.md) |

Each extension uses pandas and NumPy for data handling and artifacts, scikit-learn for features/baseline/evaluation, and optional PyTorch or TensorFlow training engines. Root npm scripts are added where a root package.json exists; otherwise use the documented Python module commands.

Changes are local: nothing was committed, pushed or deployed. The workbenches do not automatically modify live application decisions. Synthetic example datasets demonstrate execution only; they are not evidence of useful real-world accuracy. ESPnet and SpeechBrain remain in Boli, where audio recognition is relevant.
