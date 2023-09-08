export default [{
            label: "Flow Chart", value: `\n\`\`\`mermaid
flowchart LR
    markdown[This ** is ** _Markdown_
            ]
    newLines["Line1
    Line 2
    Line 3"]
    markdown --> newLines
\`\`\``
            },
            {
            label: "Sequence Diagram", value: `\n\`\`\`mermaid
sequenceDiagram
Alice->>John: Hello John, how are you?
John-->>Alice: Great!
Alice-)John: See you later!
\`\`\``
            },
            {
            label: "Class Diagram", value: `\n\`\`\`mermaid
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()

    class Duck{
        +String beakColor
        +swim()
        +quack()
                }
    class Fish{
        -int sizeInFeet
        -canEat()
                }
    class Zebra{
        +bool is_wild
        +run()
                }
\`\`\``
            },
            {
            label: "State Diagram", value: `\n\`\`\`mermaid
stateDiagram-v2
    [*
                ] --> Still
    Still --> [*
                ]

    Still --> Moving
    Moving --> Still
    Moving --> Crash
    Crash --> [*
                ]
\`\`\``
            },
            {
            label: "Entity Relationship Diagram", value: `\n\`\`\`mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER
                    }|..|{ DELIVERY-ADDRESS : uses
\`\`\``
                    },
                    {
            label: "User Journey Diagram", value: `\n\`\`\`mermaid
journey
    title My working day
    section Go to work
    Make tea: 5: Me
    Go upstairs: 3: Me
    Do work: 1: Me, Cat
    section Go home
    Go downstairs: 5: Me
    Sit down: 5: Me
\`\`\``
                    },
                    {
            label: "Gantt Chart", value: `\n\`\`\`mermaid
gantt
    title A Gantt Diagram
    dateFormat  YYYY-MM-DD
    section Section
    A task           :a1,
                        2014-01-01,
                        30d
    Another task     :after a1  ,
                        20d
    section Another
    Task in sec      : 2014-01-12,
                        12d
    another task      : 24d
\`\`\``
                    },
                    {
            label: "Pie Chart", value: `\n\`\`\`mermaid
pie title Pets adopted by volunteers
    "Dogs": 386
    "Cats": 85
    "Rats": 15
\`\`\``
                    },
                    {
            label: "Requirement Diagram", value: `\n\`\`\`mermaid
requirementDiagram

    requirement test_req {
    id: 1
    text: the test text.
    risk: high
    verifymethod: test
                        }

    element test_entity {
    type: simulation
                        }

    test_entity - satisfies -> test_req
\`\`\``
                    },
                    {
            label: "Mindmap", value: `\n\`\`\`mermaid
mindmap
    Root
        A
          B
          C
\`\`\``
                    },
                    {
            label: "Timeline", value: `\n\`\`\`mermaid
timeline
    title History of Social Media Platform
    2002 : LinkedIn
    2004 : Facebook
        : Google
    2005 : Youtube
    2006 : Twitter
\`\`\``
}];
