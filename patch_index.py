import re

with open("index.html", "r") as f:
    content = f.read()

# Remove the block around lines 31-45
# We can find the exact text and remove it
block_to_remove = """
    <!-- The tag is mounted here, in the document, and never from React. A tag
         mounted by a component is a tag that misses everything that happens
         before hydration - and on a static host that is most of a short visit.
         The snippet below is Google's own, unedited. -->
    <link rel="preconnect" href="https://www.googletagmanager.com" crossorigin />
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-4LJMT1DZ69"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-4LJMT1DZ69');
</script>"""

# Using replace to remove the block
content = content.replace(block_to_remove, "")

# Insert the new block immediately after <head>
insert_block = """
    <!-- Google's instruction for this property, followed exactly: paste the tag
         on every page, immediately after the <head> element, one tag per page.
         So it is the first thing in the head, unedited, and mounted from the
         document rather than from React. -->
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-4LJMT1DZ69"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-4LJMT1DZ69');
</script>
"""

content = content.replace("<head>", "<head>" + insert_block)

with open("index.html", "w") as f:
    f.write(content)
